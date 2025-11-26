"""
STRIDE Threat Modeling Script für Pull Requests.

Generiert STRIDE-Bedrohungsmodelle basierend auf Systembeschreibungen.
Nutzt OpenAI GPT (falls verfügbar) oder regelbasierte Heuristiken als Fallback.

Verwendung:
    python threat_modeling_pr.py --description "Flask Webapp mit MySQL" --output markdown
"""

import argparse
import json
import os
from typing import Dict, List


def rule_based_stride(description: str) -> Dict[str, List[str]]:
    """Generiert ein STRIDE-Bedrohungsmodell basierend auf Heuristiken."""
    threats: Dict[str, List[str]] = {c: [] for c in ["Spoofing", "Tampering", "Repudiation", "InformationDisclosure", "DenialOfService", "ElevationOfPrivilege"]}
    text = description.lower()
    # Heuristiken
    if any(x in text for x in ["login", "authentifizierung", "authentication", "user", "benutzer"]):
        threats["Spoofing"].append("Gefälschte Benutzeridentitäten oder Credential-Stuffing-Angriffe.")
        threats["Repudiation"].append("Fehlende Audit-Trails für Benutzeraktionen.")
    if any(x in text for x in ["database", "datenbank", "sql", "storage", "speicher"]):
        threats["Tampering"].append("Manipulation gespeicherter Daten via SQL-Injection.")
        threats["InformationDisclosure"].append("Datenexfiltration durch unsichere Abfragen.")
    if any(x in text for x in ["api", "rest", "endpoint", "schnittstelle"]):
        threats["DenialOfService"].append("API-Endpunkte können durch übermäßige Anfragen überlastet werden (DDoS).")
    if any(x in text for x in ["admin", "privilege", "berechtigung", "rolle", "role"]):
        threats["ElevationOfPrivilege"].append("Angreifer können durch falsch konfigurierte Rollen administrative Rechte erlangen.")
    if any(x in text for x in ["file", "datei", "upload", "download"]):
        threats["Tampering"].append("Bösartige Datei-Uploads können zu Remote-Code-Execution führen.")
    return threats


def llm_based_stride(description: str) -> Dict[str, List[str]]:
    """Verwendet GPT zur Generierung von STRIDE-Bedrohungen. Fallback auf regelbasierte Analyse."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return rule_based_stride(description)
    try:
        import openai  # type: ignore
        client = openai.OpenAI(api_key=api_key)
        prompt = (
            "Sie sind ein erfahrener Security‑Architekt. Erstellen Sie ein STRIDE‑Threat‑Model "
            "für das folgende System.  Geben Sie pro STRIDE‑Kategorie mehrere typische Bedrohungen an "
            "und schlagen Sie jeweils eine Gegenmaßnahme vor.\n"
            f"Beschreibung: {description}"
        )
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        content = response.choices[0].message.content
        # Versuche JSON-Parsing (falls Modell in JSON antwortet)
        try:
            return json.loads(content)
        except Exception:
            # Fallback: Rohe Ausgabe zurückgeben
            return {"LLMOutput": [content]}
    except Exception:
        return rule_based_stride(description)


def print_stride(threats: Dict[str, List[str]]) -> None:
    for category, items in threats.items():
        print(f"\n## {category}")
        if not items:
            print("(keine erkannten Bedrohungen)")
        else:
            for i, item in enumerate(items, 1):
                print(f"{i}. {item}")


def format_stride_markdown(threats: Dict[str, List[str]]) -> str:
    """Formatiert STRIDE-Bedrohungen als Markdown für GitHub-Kommentare."""
    output = ["# 🔒 STRIDE Bedrohungsanalyse\n"]

    if "LLMOutput" in threats:
        # LLM hat Rohdaten geliefert
        output.append(threats["LLMOutput"][0])
    else:
        # Strukturierte STRIDE-Ausgabe formatieren
        for category, items in threats.items():
            output.append(f"\n## {category}\n")
            if not items:
                output.append("_(keine erkannten Bedrohungen)_\n")
            else:
                for i, item in enumerate(items, 1):
                    output.append(f"{i}. {item}\n")

    output.append("\n---\n")
    output.append("_Automatisch generiert mit STRIDE Threat Modeling_\n")
    return "".join(output)
def main() -> None:
    parser = argparse.ArgumentParser(description="STRIDE-Bedrohungsmodell generieren")
    parser.add_argument("--description", required=True, help="Systembeschreibung (Klartext)")
    parser.add_argument("--methodology", default="stride", choices=["stride"], help="Bedrohungsmodellierungs-Methodik")
    parser.add_argument("--output", choices=["console", "markdown", "json"], default="console",
                        help="Ausgabeformat: console (Standard), markdown (für GitHub) oder json")
    parser.add_argument("--output-file", help="Ausgabe in Datei schreiben statt stdout")
    args = parser.parse_args()

    if args.methodology == "stride":
        threats = llm_based_stride(args.description)

        # Ausgabe basierend auf Format generieren
        if args.output == "json":
            output_text = json.dumps(threats, indent=2, ensure_ascii=False)
        elif args.output == "markdown":
            output_text = format_stride_markdown(threats)
        else:  # console
            if "LLMOutput" in threats:
                output_text = threats["LLMOutput"][0]
            else:
                # Console-Ausgabe verwenden
                print_stride(threats)
                return

        # In Datei oder stdout schreiben
        if args.output_file:
            with open(args.output_file, "w", encoding="utf-8") as f:
                f.write(output_text)
        else:
            print(output_text)
if __name__ == "__main__":
    main()
