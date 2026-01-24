#!/usr/bin/env python3
"""
Script to download required data files from Google Drive.

This script downloads:
- neo4j.dump -> data/neo4j.dump
- system.dump -> data/system.dump
- consulta_cand_2024_SP.csv -> data/candidates/consulta_cand_2024_SP.csv
"""

import os
import sys
from pathlib import Path

try:
    import gdown
except ImportError:
    print("Error: gdown is not installed.")
    print("Please install it with: pip install gdown")
    sys.exit(1)


# Google Drive file IDs and their destination paths
FILES_TO_DOWNLOAD = {
    "1tl74VrGT1sGVvH7BZacDuz5BLg1PKqCa": {
        "path": "data/neo4j.dump",
        "name": "neo4j.dump"
    },
    "1zccsC6iBCt1FU17TZxomC0f6qnAL48Gm": {
        "path": "data/system.dump",
        "name": "system.dump"
    },
    "1c-QwuI_P8ty8x2ZUbOx_UAp1hYj-jdaT": {
        "path": "data/candidates/consulta_cand_2024_SP.csv",
        "name": "consulta_cand_2024_SP.csv"
    }
}


def ensure_directory_exists(file_path):
    """Create directory structure if it doesn't exist."""
    directory = os.path.dirname(file_path)
    if directory:
        os.makedirs(directory, exist_ok=True)


def download_file(file_id, destination_path, file_name):
    """Download a file from Google Drive."""
    # Construct Google Drive download URL
    url = f"https://drive.google.com/uc?id={file_id}"
    
    print(f"Downloading {file_name}...")
    print(f"  From: {url}")
    print(f"  To: {destination_path}")
    
    try:
        # Ensure destination directory exists
        ensure_directory_exists(destination_path)
        
        # Download the file
        gdown.download(url, destination_path, quiet=False)
        
        # Verify file was downloaded
        if os.path.exists(destination_path):
            file_size = os.path.getsize(destination_path)
            print(f"  ✓ Successfully downloaded {file_name} ({file_size:,} bytes)")
            return True
        else:
            print(f"  ✗ Error: File was not downloaded")
            return False
            
    except Exception as e:
        print(f"  ✗ Error downloading {file_name}: {str(e)}")
        return False


def main():
    """Main function to download all required files."""
    # Get the script directory (Pipeline directory)
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("=" * 60)
    print("Downloading required data files from Google Drive")
    print("=" * 60)
    print()
    
    success_count = 0
    total_count = len(FILES_TO_DOWNLOAD)
    
    for file_id, file_info in FILES_TO_DOWNLOAD.items():
        destination_path = file_info["path"]
        file_name = file_info["name"]
        
        # Check if file already exists
        if os.path.exists(destination_path):
            print(f"⏭️  {file_name} already exists, skipping...")
            print(f"   Location: {destination_path}")
            print()
            success_count += 1
            continue
        
        if download_file(file_id, destination_path, file_name):
            success_count += 1
        
        print()
    
    print("=" * 60)
    if success_count == total_count:
        print(f"✓ All files downloaded successfully ({success_count}/{total_count})")
        return 0
    else:
        print(f"⚠ Some files failed to download ({success_count}/{total_count})")
        return 1


if __name__ == "__main__":
    sys.exit(main())

