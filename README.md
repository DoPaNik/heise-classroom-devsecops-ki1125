# DevSecOps & KI - Classroom Demos

heise academy - DevSecOps und KI ([DEVSECOPS-KI1125](https://heise-academy.de/classrooms/devsecops-ki1125))

Dieses Repository enthält alle Demo-Materialien, die im Rahmen des Heise-Academy-Classrooms „DevSecOps & KI: Synergien verstehen“ eingesetzt oder live gezeigt wurden. Ziel ist es, den Teilnehmenden praktische Beispiele zur Verfügung zu stellen, mit denen sie die Inhalte selbst ausprobieren, erweitern oder in ihre eigenen Umgebungen übertragen können.

## 📚 Inhalte dieses Repos

1. 🔧 Jupyter Notebook: „Dockerfiles mit LLMs erstellen & reviewen“

TBD

## 💡 Voraussetzungen

Um die Demos und Notebooks in diesem Repository erfolgreich ausführen zu können, benötigst Du folgendes:

### Software-Anforderungen

- **Python 3.10 oder höher** – Die Demo-Anwendungen und Notebooks basieren auf Python. Zur Verwaltung der Abhängigkeiten wird [Poetry](https://python-poetry.org/) verwendet.

- **Container Engine** – Für die Containerisierung und das Ausführen von Docker-Images wird eine der folgenden Lösungen benötigt:
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - [Rancher Desktop](https://rancherdesktop.io/)
  - Andere OCI-kompatible Container Engines (Podman, containerd, etc.)

- **act** – Tool zum lokalen Ausführen von GitHub Actions Workflows. Installation und Dokumentation: [nektos/act](https://nektosact.com/)

- **Pre-commit** – Framework für Git-Hook-Scripts zur Automatisierung von Code-Quality-Checks. Installation: `pip install pre-commit` oder über Poetry.

- **Jupyter-Notebook-Umgebung** – Zum Ausführen der interaktiven Notebooks stehen folgende Optionen zur Verfügung:
  - [JupyterLab](https://jupyter.org/) (kann über Poetry installiert werden: `poetry run jupyter lab`)
  - [VS Code](https://code.visualstudio.com/) mit dem [Jupyter Extension Pack](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter)

### API-Zugang zu LLM-Providern

Für die LLM-basierten Demos benötigen Sie API-Zugang zu mindestens einem der folgenden Provider:

- **[OpenAI](https://platform.openai.com/)** – API-Key für GPT-4, GPT-4o oder andere OpenAI-Modelle
- **[OpenRouter](https://openrouter.ai/)** – Zugang zu verschiedenen Modellen (Claude, Gemini, etc.) über eine einheitliche API
- **[LM Studio](https://lmstudio.ai/)** – Für lokales Ausführen von Open-Source-Modellen (DeepSeek, LLaMA, etc.)
- Andere OpenAI-kompatible Endpoints (Ollama, LocalAI, etc.)

Die API-Keys werden über eine `.env`-Datei im Projektverzeichnis konfiguriert (siehe `.env.example` als Vorlage).

### Kenntnisse

Folgende Grundkenntnisse sind hilfreich, um die Demos optimal nutzen zu können:

- **Docker & Containerisierung** – Verständnis von Dockerfiles, Container-Images und Best Practices
- **DevSecOps-Prozesse** – CI/CD, Security-Scans, Automatisierung
- **Python-Grundlagen** – Zum Verstehen und Anpassen der Code-Beispiele
- **Git & GitHub Actions** – Für das Arbeiten mit Workflows und automatisierten Pipelines




## 🚀 Getting Started

### 1. Repository klonen und Abhängigkeiten installieren

```bash
# Repository klonen
git clone https://github.com/DoPaNik/heise-classroom-devsecops-ki1125.git
cd heise-classroom-devsecops-ki1125

# Abhängigkeiten mit Poetry installieren
poetry install --no-root

# Pre-commit Hooks aktivieren (optional, aber empfohlen)
poetry run pre-commit install
```

### 2. API-Keys konfigurieren

Erstelle eine `.env`-Datei im Projektverzeichnis unter notebooks und füge deine API-Keys hinzu:

```bash
# .env Datei erstellen
cp .env.example .env

# Editiere die .env Datei und füge deine API-Keys ein
# Beispiel:
# OPENAI_API_KEY=sk-...
# OPEN_ROUTER_API_KEY=sk-...
```

### 3. Jupyter Notebooks ausführen

Starte JupyterLab, um die interaktiven Notebooks zu nutzen:

```bash
# JupyterLab im Browser starten
poetry run jupyter lab
```

JupyterLab öffnet sich automatisch im Browser unter `http://localhost:8888`. Navigiere zum Verzeichnis `notebooks/` und öffne eines der verfügbaren Notebooks:

- **`Dockerfile.ipynb`** – Dockerfiles mit LLMs erstellen, reviewen und vergleichen
- **`Secrets.ipynb`** – Secret Detection mit Pre-Commit Hooks demonstrieren

**Tipp:** Alternativ kannst du die Notebooks auch in VS Code öffnen, wenn du die Jupyter-Extension installiert hast.

### 4. GitHub Actions lokal testen mit act

Das Repository enthält ein Hilfsskript `runGithubActionLocally.sh`, das GitHub Actions Workflows lokal ausführt. Das Script erkennt automatisch deine Container Engine (Docker Desktop, Rancher Desktop, etc.) und konfiguriert `act` entsprechend.

```bash
# Script ausführbar machen (einmalig)
chmod +x runGithubActionLocally.sh

# Alle verfügbaren Workflows anzeigen
./runGithubActionLocally.sh --list

# Workflow ausführen (z.B. Container Build)
./runGithubActionLocally.sh

# Spezifischen Workflow ausführen
./runGithubActionLocally.sh -W .github/workflows/buildAndPushContainer.yml

# Dry-run (zeigt nur was ausgeführt würde)
./runGithubActionLocally.sh -n
```

**Hinweis:** Das Script setzt voraus, dass `act` installiert ist und deine Container Engine läuft.

## 🤝 Mitwirkung

Pull Requests, Issues und weitere Verbesserungsvorschläge ausdrücklich gewünscht und willkommen. Dieses Repository soll wachsen – gerne auch mit Beispielen aus eurem Alltag.

## 📬 Kontakt / Referenzen
Classroom-Beschreibung: DevSecOps und KI – Sichere Softwareentwicklung im Zeitalter der Künstlichen Intelligenz (heise academy)
Fragen & Austausch gerne über LinkedIn ([Andi](https://www.linkedin.com/in/andifalk/) / [Dominik](https://www.linkedin.com/in/dominikpabst/)) oder direkt über den Classroom.
