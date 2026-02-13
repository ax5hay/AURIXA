from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from .models import RunTaskRequest, RunTaskResponse, AgentResult, AgentTask

# A real implementation would have a dynamic tool registry
MOCK_TOOLS = {
    "get_weather": lambda location: f"The weather in {location} is sunny.",
    "search_knowledge_base": lambda query: f"Searching for '{query}' found 3 documents.",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log service startup and shutdown."""
    logger.info("Agent Runtime service starting up")
    yield
    logger.info("Agent Runtime service shutting down")


app = FastAPI(
    title="AURIXA Agent Runtime",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for executing autonomous agent tasks with tool-calling capabilities.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "agent-runtime", "status": "healthy"}


@app.post("/api/v1/run", response_model=RunTaskResponse, summary="Run an agent task")
async def run_task(request: RunTaskRequest):
    """
    Executes an agentic task.

    This is a simplified mock implementation. A real implementation would:
    1.  Use an LLM with function-calling capabilities to decide which tool to use.
    2.  Maintain a state machine for multi-step tasks.
    3.  Execute tools and feed the results back into the LLM.
    4.  Handle errors and retries.
    """
    task = request.task
    logger.info("Received request to run task with prompt: '{}'", task.prompt)

    # Mock logic: if the prompt mentions a tool, pretend to call it.
    final_output = "I'm not sure how to help with that."
    tool_calls = []

    for tool_name, tool_func in MOCK_TOOLS.items():
        if tool_name in task.prompt:
            # Mock extracting arguments from the prompt
            arg = task.prompt.split(tool_name)[-1].strip()
            result = tool_func(arg)
            tool_calls.append({"tool_name": tool_name, "arguments": arg, "result": result})
            final_output = f"I have run the tool {tool_name} and the result is: {result}"
            break
    
    agent_result = AgentResult(
        output=final_output,
        tool_calls=tool_calls,
        steps=[{"step": "reasoning", "details": "Decided to call a tool based on prompt keywords."}]
    )

    return RunTaskResponse(result=agent_result)
