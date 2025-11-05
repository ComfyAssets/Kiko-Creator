#!/usr/bin/env python3
"""
Safetensors Metadata Reader
Reads metadata from safetensors files using efficient manual parsing.
This approach reads only the JSON header without loading tensor data.
"""

import sys
import json
import struct
from pathlib import Path


def read_metadata(file_path):
    """
    Read metadata from a safetensors file.

    Safetensors format: [8-byte header length][JSON metadata][tensor data]
    This reads only the header, not the entire file.

    Args:
        file_path: Path to the safetensors file

    Returns:
        dict: Metadata dictionary or None if not found
    """
    try:
        with open(file_path, 'rb') as f:
            # Read 8-byte header (little-endian uint64)
            header_bytes = f.read(8)
            if len(header_bytes) < 8:
                return {"error": "File too small"}

            # Unpack header to get JSON length
            json_length = struct.unpack('<Q', header_bytes)[0]

            # Sanity check: metadata should be < 100MB
            if json_length <= 0 or json_length > 100 * 1024 * 1024:
                return {"error": f"Invalid JSON length: {json_length}"}

            # Read only the JSON metadata portion
            json_bytes = f.read(json_length)
            if len(json_bytes) < json_length:
                return {"error": "Incomplete metadata"}

            # Parse JSON
            metadata_dict = json.loads(json_bytes.decode('utf8'))

            # Return __metadata__ field if it exists
            if '__metadata__' in metadata_dict:
                return metadata_dict['__metadata__']

            return None

    except Exception as e:
        # Return error in JSON format
        return {"error": str(e)}


def extract_trigger_words(metadata):
    """
    Extract trigger words from metadata.

    Args:
        metadata: Metadata dictionary

    Returns:
        list: List of trigger words
    """
    if not metadata or isinstance(metadata, dict) and "error" in metadata:
        return []

    trigger_words = []

    # Check for common trigger word fields
    if "modelspec.trigger_words" in metadata:
        words = metadata["modelspec.trigger_words"]
        if isinstance(words, list):
            trigger_words.extend(words)
        elif isinstance(words, str):
            trigger_words.append(words)

    # Check for activation text from tag frequency
    if "ss_tag_frequency" in metadata:
        try:
            tag_freq = json.loads(metadata["ss_tag_frequency"])
            # Get all tags from nested structure
            for dataset in tag_freq.values():
                if isinstance(dataset, dict):
                    # Get top 5 tags per dataset
                    tags = sorted(dataset.items(), key=lambda x: x[1], reverse=True)[:5]
                    trigger_words.extend([tag for tag, _ in tags])
        except (json.JSONDecodeError, AttributeError):
            pass

    # Remove duplicates while preserving order
    seen = set()
    unique_words = []
    for word in trigger_words:
        if word and word not in seen:
            seen.add(word)
            unique_words.append(word)

    return unique_words


def extract_civitai_data(metadata):
    """
    Extract CivitAI model and version IDs from metadata.

    Args:
        metadata: Metadata dictionary

    Returns:
        dict: CivitAI data with modelId and id (version ID)
    """
    if not metadata or isinstance(metadata, dict) and "error" in metadata:
        return {}

    civitai_data = {}

    # Check for CivitAI model ID
    model_id = (
        metadata.get("modelspec.sai_model_spec") or
        metadata.get("ss_model_id") or
        metadata.get("modelId") or
        metadata.get("model_id")
    )

    if model_id:
        civitai_data["modelId"] = str(model_id)

    # Check for CivitAI version ID
    version_id = (
        metadata.get("ss_version_id") or
        metadata.get("versionId") or
        metadata.get("version_id")
    )

    if version_id:
        civitai_data["id"] = str(version_id)

    return civitai_data


def main():
    """
    Main entry point for CLI usage.
    Reads file path from command line and outputs JSON.
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]

    # Check if file exists
    if not Path(file_path).exists():
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)

    # Read metadata
    metadata = read_metadata(file_path)

    # Build response object
    response = {}

    if metadata and "error" not in metadata:
        # Extract useful fields
        response["metadata"] = metadata
        response["triggerWords"] = extract_trigger_words(metadata)
        response["civitai"] = extract_civitai_data(metadata)

        # Add description if available
        description = (
            metadata.get("modelspec.description") or
            metadata.get("ss_comment") or
            metadata.get("description")
        )
        if description:
            response["description"] = description

        # Add base model if available
        base_model = (
            metadata.get("modelspec.architecture") or
            metadata.get("ss_base_model_version") or
            metadata.get("base_model")
        )
        if base_model:
            response["baseModel"] = base_model
    else:
        response = metadata or {"error": "No metadata found"}

    # Output JSON
    print(json.dumps(response, ensure_ascii=False))


if __name__ == "__main__":
    main()
