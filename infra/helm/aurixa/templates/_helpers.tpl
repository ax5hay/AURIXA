{{- define "aurixa.labels" -}}
app.kubernetes.io/part-of: aurixa
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
aurixa.io/environment: {{ .Values.global.environment | quote }}
{{- end }}

{{- define "aurixa.fullname" -}}
{{- printf "%s-%s" .root.Release.Name .name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "aurixa.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{- define "aurixa.serviceLabels" -}}
{{ include "aurixa.labels" .root }}
app.kubernetes.io/name: {{ .name }}
{{- end }}

{{- define "aurixa.serviceAccountName" -}}
{{- if .Values.global.serviceAccount.create -}}
{{- default (include "aurixa.fullname" (dict "root" . "name" "workloads")) .Values.global.serviceAccount.name -}}
{{- else -}}
{{- required "global.serviceAccount.name is required when service account creation is disabled" .Values.global.serviceAccount.name -}}
{{- end -}}
{{- end }}

{{- define "aurixa.serviceUrl" -}}
{{- $service := index .root.Values.services .name -}}
{{- printf "http://%s:%v" (include "aurixa.fullname" (dict "root" .root "name" .name)) $service.port -}}
{{- end }}

{{- define "aurixa.image" -}}
{{- $registry := .root.Values.global.imageRegistry -}}
{{- $repository := .service.image.repository -}}
{{- if $registry }}{{ $registry }}/{{ end }}{{ $repository }}{{ if .service.image.digest }}@{{ .service.image.digest }}{{ else }}:{{ .service.image.tag | default .root.Chart.AppVersion }}{{ end }}
{{- end }}
