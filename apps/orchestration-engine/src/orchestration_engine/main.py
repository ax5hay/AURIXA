import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from aurixa_db import get_db_session, engine, Base, models as db_models
from . import clients
from .models import PipelineRequest, ConversationState, PipelineStep as PydanticPipelineStep

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    logger.info("Orchestration engine starting up")
    async with engine.begin() as conn:
        # This will create tables for all models that inherit from Base
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created.")
    yield
    logger.info("Orchestration engine shutting down")


app = FastAPI(
    title="AURIXA Orchestration Engine",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for orchestrating complex conversational AI pipelines.",
)


async def execute_step(
    db: AsyncSession, conversation: db_models.Conversation, name: str, input_data: dict, coro
) -> (dict, db_models.PipelineStep):
    """Execute a pipeline step, record it, and update its state."""
    step = db_models.PipelineStep(
        conversation_id=conversation.id,
        step_name=name,
        status="in_progress",
        input=input_data,
        start_time=time.time(),
    )
    db.add(step)
    await db.commit()

    logger.debug("Executing step: {}", name)
    try:
        result = await coro
        step.output = result
        step.status = "success"
        logger.info("Step {} succeeded", name)
        return result, step
    except Exception as e:
        logger.error("Step {} failed: {}", name, e)
        step.status = "error"
        step.error_message = str(e)
        raise
    finally:
        step.end_time = time.time()
        db.add(step)
        await db.commit()


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "orchestration-engine", "status": "healthy"}


@app.post("/api/v1/pipelines", response_model=ConversationState, summary="Run an orchestration pipeline")
async def run_pipeline(
    request: PipelineRequest, db: AsyncSession = Depends(get_db_session)
):
    """
    Run a full conversational pipeline and persist its state.
    """
    logger.info("Received new pipeline request for session: {}", request.session_id)

    # Create a new conversation record in the database
    conversation = db_models.Conversation(
        session_id=request.session_id,
        meta_data={"user_id": request.user_id, "tenant_id": request.tenant_id}
    )
    db.add(conversation)
    await db.commit()
    
    final_response_text = ""
    try:
        # 1. Classify intent
        intent_result, _ = await execute_step(
            db, conversation, "classify_intent", {"prompt": request.prompt},
            clients.call_llm_router(request.prompt)
        )

        # 2. Retrieve context
        rag_context, _ = await execute_step(
            db, conversation, "knowledge_retrieval", {"prompt": request.prompt, "intent": intent_result},
            clients.call_rag_service(request.prompt, intent_result)
        )
        
        # 3. Generate response
        generation_result, _ = await execute_step(
            db, conversation, "generate_response", {"context": rag_context, "intent": intent_result},
            clients.call_llm_generate(
                model=intent_result.get("model"),
                provider=intent_result.get("provider"),
                prompt=request.prompt,
                context=rag_context
            )
        )
        generated_text = generation_result.get("content", "")

        # 4. Validate output
        validation_result, _ = await execute_step(
            db, conversation, "validate_output", {"text": generated_text},
            clients.call_safety_guardrails(generated_text)
        )

        if not validation_result.get("is_safe"):
            final_response_text = validation_result.get("validated_text", "[Content Redacted]")
            logger.warning("Pipeline finished with unsafe response for session: {}", request.session_id)
        else:
            final_response_text = validation_result.get("validated_text")
            logger.success("Pipeline executed successfully for session: {}", request.session_id)
    
    except Exception as e:
        logger.error("Pipeline failed for session {}: {}", request.session_id, e)
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {e}")

    # Construct the final Pydantic response model from the DB data
    await db.refresh(conversation, ["pipeline_steps"])
    pydantic_steps = [PydanticPipelineStep(**step.__dict__) for step in conversation.pipeline_steps]
    
    return ConversationState(
        session_id=conversation.session_id,
        request=request, # The original request
        steps=pydantic_steps,
        final_response=final_response_text,
        created_at=conversation.created_at.timestamp(),
        updated_at=conversation.updated_at.timestamp(),
    )
