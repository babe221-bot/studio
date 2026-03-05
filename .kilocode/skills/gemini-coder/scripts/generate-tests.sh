#!/usr/bin/env bash

TARGET_FILE="$1"

if [ -z "$TARGET_FILE" ]; then
    echo "Usage: $0 <target_file>"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. Detect Framework
FRAMEWORK=$(node "$SCRIPT_DIR/detect-framework.js")
echo "### FRAMEWORK: $FRAMEWORK ###"

# 2. Analyze Exports
EXPORTS=$(node "$SCRIPT_DIR/analyze-exports.js" "$TARGET_FILE")
echo "### EXPORTS: $EXPORTS ###"

# 3. Create prompt for Gemini
cat <<EOF
I want to generate a test file for the following file:
- **Target File:** $TARGET_FILE
- **Testing Framework:** $FRAMEWORK
- **Identified Exports to Test:**
$EXPORTS

Please generate a comprehensive test suite that:
- Uses the project's identified framework ($FRAMEWORK).
- Includes unit tests for each export.
- Handles edge cases (e.g., null/undefined inputs).
- Follows the project's existing coding and testing styles.
EOF
