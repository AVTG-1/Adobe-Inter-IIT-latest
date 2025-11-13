#!/usr/bin/env python3
"""Validate project structure and file integrity."""

import os
from pathlib import Path

def validate_structure():
    """Validate that all required files and directories exist."""
    
    base_dir = Path(__file__).parent
    
    required_files = [
        # Core app files
        "app/__init__.py",
        
        # Orchestrator layer
        "app/orchestration/__init__.py",
        "app/orchestration/orchestrator/__init__.py",
        "app/orchestration/orchestrator/general_edit_orchestrator.py",
        "app/orchestration/application/__init__.py",
        "app/orchestration/application/main.py",
        "app/orchestration/application/config.py",
        "app/orchestration/application/resources/__init__.py",
        "app/orchestration/application/resources/health.py",
        "app/orchestration/application/resources/edit_workflow.py",
        
        # Core layer
        "app/core/__init__.py",
        "app/core/models/__init__.py",
        "app/core/models/schemas.py",
        "app/core/services/__init__.py",
        "app/core/services/app/__init__.py",
        "app/core/services/app/storage_service.py",
        "app/core/services/third_party/__init__.py",
        "app/core/services/third_party/base_service.py",
        
        # Experts layer
        "app/experts/__init__.py",
        "app/experts/agents/__init__.py",
        "app/experts/agents/base_agent.py",
        "app/experts/agents/inpainting_agent.py",
        "app/experts/agents/relighting_agent.py",
        "app/experts/tools/__init__.py",
        "app/experts/tools/image_tools.py",
        
        # Tests
        "tests/__init__.py",
        "tests/conftest.py",
        "tests/test_health.py",
        
        # Documentation
        "README.md",
        "USAGE.md",
        "IMPLEMENTATION_SUMMARY.md",
        "ARCHITECTURE_FLOW.md",
        
        # Configuration
        "requirements.txt",
        ".env.example",
        ".gitignore",
        "run.sh",
    ]
    
    print("🔍 Validating project structure...\n")
    
    missing = []
    found = []
    
    for file_path in required_files:
        full_path = base_dir / file_path
        if full_path.exists():
            found.append(file_path)
            print(f"✅ {file_path}")
        else:
            missing.append(file_path)
            print(f"❌ {file_path}")
    
    print(f"\n📊 Summary:")
    print(f"   Found: {len(found)}/{len(required_files)} files")
    
    if missing:
        print(f"   Missing: {len(missing)} files")
        print("\n❌ Validation failed - missing files:")
        for file in missing:
            print(f"      - {file}")
        return False
    else:
        print("\n✅ All required files present!")
        return True

def check_code_integrity():
    """Basic check that Python files are valid."""
    print("\n🔍 Checking Python files for basic syntax...\n")
    
    base_dir = Path(__file__).parent
    python_files = list(base_dir.rglob("*.py"))
    python_files = [f for f in python_files if "__pycache__" not in str(f)]
    
    errors = []
    
    for py_file in python_files:
        try:
            with open(py_file, 'r') as f:
                compile(f.read(), str(py_file), 'exec')
            print(f"✅ {py_file.relative_to(base_dir)}")
        except SyntaxError as e:
            errors.append((py_file, e))
            print(f"❌ {py_file.relative_to(base_dir)}: {e}")
    
    if errors:
        print(f"\n❌ Found {len(errors)} files with syntax errors")
        return False
    else:
        print(f"\n✅ All {len(python_files)} Python files have valid syntax!")
        return True

def main():
    """Run all validations."""
    print("="*60)
    print("  AI Photo Editor Backend - Structure Validation")
    print("="*60 + "\n")
    
    structure_ok = validate_structure()
    syntax_ok = check_code_integrity()
    
    print("\n" + "="*60)
    if structure_ok and syntax_ok:
        print("✅ All validations passed!")
        print("="*60)
        print("\n🚀 Ready to install dependencies and run the app!")
        print("\nNext steps:")
        print("  1. pip install -r requirements.txt")
        print("  2. cp .env.example .env")
        print("  3. ./run.sh")
        print("  4. Visit http://localhost:8000/docs")
        return 0
    else:
        print("❌ Validation failed!")
        print("="*60)
        return 1

if __name__ == "__main__":
    exit(main())
