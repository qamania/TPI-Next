#!/usr/bin/env python3
"""
Generate static HTML page for TPI NEXT checklist.
Usage: python generate_static.py <checklist_json_file>
"""

import json
import os
import sys
from jinja2 import Environment, FileSystemLoader


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

    return categories, matrix_data


def determine_template_and_output(json_file, lang_code):
    """Determine which template to use and output directory based on language."""
    if lang_code == "ua":
        return "index_ua.html", f"web/{lang_code}/index.html"
    else:
        return "index.html", f"web/{lang_code}/index.html"


def generate_html_page(json_file):
    """Generate HTML page from JSON file."""
    if not os.path.exists(json_file):
        print(f"Error: File '{json_file}' not found.")
        return False

    print(f"Loading checklist data from {json_file}...")

    # Load checklist data
    categories, matrix_data = load_checklist(json_file)

    # Load JSON to get language code
    with open(json_file, encoding="utf-8") as f:
        data = json.load(f)

    lang_code = data.get("lang", "en")  # Default to 'en' if not specified
    print(f"Detected language: {lang_code}")

    # Determine template and output file
    template_name, output_path = determine_template_and_output(json_file, lang_code)

    # Setup Jinja2 environment
    env = Environment(loader=FileSystemLoader("templates"))

    # Load template
    try:
        template = env.get_template(template_name)
        print(f"Using template: {template_name}")
    except Exception as e:
        print(f"Error loading template '{template_name}': {e}")
        # Fallback to index.html
        try:
            template = env.get_template("index.html")
            print("Falling back to index.html template")
        except Exception as e2:
            print(f"Error loading fallback template: {e2}")
            return False

    # Create language-specific directory
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)

    # Generate HTML
    html_content = template.render(categories=categories, matrix_data=matrix_data)

    # Write HTML file to language-specific directory
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Generated {output_path}")
    return output_path


def main():
    """Main function."""
    if len(sys.argv) != 2:
        print("Usage: python generate_static.py <checklist_json_file>")
        print("Example: python generate_static.py checklist_en.json")
        sys.exit(1)

    json_file = sys.argv[1]

    print("Generating static HTML page for TPI NEXT checklist...")

    output_path = generate_html_page(json_file)
    if output_path:
        print("\nStatic HTML generation completed!")
        print(f"Output: {output_path}")
    else:
        print("\nError: Failed to generate HTML page.")
        sys.exit(1)


if __name__ == "__main__":
    main()
