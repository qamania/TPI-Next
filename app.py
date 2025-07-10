from flask import Flask, render_template
import json
import os

app = Flask(__name__)


def load_checklist(json_file):
    """Load checklist data from JSON file and process it for template rendering."""
    with open(json_file, encoding="utf-8") as f:
        data = json.load(f)

    categories = {}
    matrix_data = {}

    for category in data["tpi"]:
        for cat_name, levels in category.items():
            if cat_name not in categories:
                categories[cat_name] = {}

            # Extract area information for matrix
            area = levels.get("area", "Unknown")
            if area not in matrix_data:
                matrix_data[area] = []

            matrix_data[area].append(
                {
                    "name": cat_name,
                    "key": cat_name.lower().replace(" ", "-"),
                    "levels": {},
                }
            )

            # Process levels for both checklist and matrix
            for level, content in levels.items():
                if level != "area":  # Skip the area field
                    categories[cat_name][level] = {
                        "description": content.get("description", ""),
                        "items": content["items"],
                    }

                    # Add to matrix data
                    matrix_data[area][-1]["levels"][level] = len(content["items"])

    return categories, matrix_data, data.get("lang", "en")


def determine_template(lang_code):
    """Determine which template to use based on language."""
    if lang_code == "ua":
        return "index_ua.html"
    else:
        return "index.html"


@app.route("/")
@app.route("/<lang>")
def checklist(lang=None):
    """Serve checklist for specified language or default to English."""
    # Determine which JSON file to use
    if lang == "ua":
        json_file = "checklist_ua.json"
    else:
        json_file = "checklist_en.json"
        lang = "en"  # Default to English

    # Check if the JSON file exists
    if not os.path.exists(json_file):
        return f"Error: {json_file} not found", 404

    try:
        categories, matrix_data, detected_lang = load_checklist(json_file)
        template = determine_template(detected_lang)

        return render_template(
            template,
            categories=categories,
            matrix_data=matrix_data,
            language=detected_lang,
        )
    except Exception as e:
        return f"Error loading checklist: {str(e)}", 500


if __name__ == "__main__":
    app.run(debug=True)
