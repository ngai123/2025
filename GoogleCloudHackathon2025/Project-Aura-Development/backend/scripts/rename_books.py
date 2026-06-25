"""
Helper script to rename relationship books with long filenames.
Run this script to fix filename length issues before starting the RAG service.
"""

import os
from pathlib import Path

# Get the data directory
script_dir = Path(__file__).parent
backend_dir = script_dir.parent
data_dir = backend_dir / "data" / "relationship_books"

# Mapping of patterns to new names
rename_mappings = {
    "Attached_": "Attached.pdf",
    "Hold Me Tight": "Hold_Me_Tight.pdf",
    "Men_are_from_mars": "Men_Are_From_Mars.pdf",
    "The 5 Love Languages": "The_5_Love_Languages.pdf"
}

def rename_books():
    """Rename books with long filenames to shorter names."""
    if not data_dir.exists():
        print(f"[Error] Data directory not found: {data_dir}")
        return

    pdf_files = list(data_dir.glob("*.pdf"))

    if not pdf_files:
        print(f"[Info] No PDF files found in {data_dir}")
        return

    print(f"[Info] Found {len(pdf_files)} PDF files")
    renamed_count = 0

    for pdf_file in pdf_files:
        old_name = pdf_file.name

        # Check if file needs renaming
        needs_rename = False
        new_name = None

        for pattern, target_name in rename_mappings.items():
            if pattern in old_name:
                new_name = target_name
                needs_rename = True
                break

        if needs_rename and new_name:
            new_path = pdf_file.parent / new_name

            # Check if target already exists
            if new_path.exists():
                print(f"[Skip] {new_name} already exists")
                continue

            try:
                pdf_file.rename(new_path)
                print(f"[Renamed] {old_name[:50]}... → {new_name}")
                renamed_count += 1
            except Exception as e:
                print(f"[Error] Failed to rename {old_name}: {e}")
        else:
            print(f"[OK] {old_name[:80]}")

    print(f"\n[Summary] Renamed {renamed_count} files")

if __name__ == "__main__":
    print("=" * 60)
    print("Relationship Books Filename Fixer")
    print("=" * 60)
    print()
    rename_books()
    print()
    print("=" * 60)
    print("Done! You can now start the server.")
    print("=" * 60)
