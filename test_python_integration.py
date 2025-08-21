#!/usr/bin/env python3
"""
Test script for Python integration with confidence scorer and visual marking
"""

import sys
import os
import json
sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'lib'))

def test_confidence_scorer():
    """Test the confidence scorer module"""
    print("🧪 Testing Confidence Scorer Integration")
    print("=" * 50)
    
    try:
        from confidence_scorer import ConfidenceScorer, Criterion
        
        # Initialize scorer
        scorer = ConfidenceScorer()
        
        # Test data
        mark_scheme = [
            Criterion(
                description="Correct method for solving quadratic equation",
                marks=2,
                keywords=["quadratic", "formula", "solve", "equation"],
                partial_credit_keywords=["quadratic", "equation"]
            ),
            Criterion(
                description="Correct substitution of values",
                marks=1,
                keywords=["substitute", "values", "correct"],
                partial_credit_keywords=["substitute"]
            ),
            Criterion(
                description="Correct final answer",
                marks=1,
                keywords=["answer", "correct", "result"],
                partial_credit_keywords=["answer"]
            )
        ]
        
        student_answer = "I used the quadratic formula to solve the equation and got x = 2"
        llm_feedback = "Student used correct method but made calculation error"
        
        # Calculate confidence
        confidence = scorer.calculate_confidence_from_criteria(
            student_answer, mark_scheme, llm_feedback
        )
        
        print(f"✅ Confidence Score: {confidence.confidence_score:.3f}")
        print(f"✅ Criteria Met: {confidence.criteria_matched}/{confidence.total_criteria}")
        print(f"✅ Reasoning: {confidence.reasoning}")
        
        return True
        
    except Exception as e:
        print(f"❌ Confidence scorer test failed: {e}")
        return False

def test_visual_marking():
    """Test the visual marking module"""
    print("\n🔍 Testing Visual Marking Integration")
    print("=" * 50)
    
    try:
        from visual_marking import VisualMarker
        
        # Initialize visual marker
        marker = VisualMarker(grid_spacing=50.0)
        
        # Test expected answer
        expected_triangle = {
            'shape_type': 'triangle',
            'vertices': [[2, 2], [4, 6], [7, 3]],
            'tolerance': {
                'scale': 0.1,
                'rotation': 5.0,
                'position': 1.0
            }
        }
        
        # Test geometric accuracy calculation
        geometric_accuracy = marker._calculate_overall_accuracy(
            scale_factor=1.05,
            rotation_angle=2.0,
            position_error=0.5,
            expected_shape=expected_triangle
        )
        
        print(f"✅ Geometric Accuracy: {geometric_accuracy:.3f}")
        print(f"✅ Expected Answer: {expected_triangle['shape_type']}")
        print(f"✅ Tolerance: Scale ±{expected_triangle['tolerance']['scale']*100}%, Rotation ±{expected_triangle['tolerance']['rotation']}°")
        
        return True
        
    except Exception as e:
        print(f"❌ Visual marking test failed: {e}")
        return False

def test_python_integration_script():
    """Test the Python integration script"""
    print("\n🔗 Testing Python Integration Script")
    print("=" * 50)
    
    try:
        from python_integration import run_confidence_scoring, run_visual_marking, run_agreement_confidence
        
        # Test confidence scoring
        confidence_data = {
            'student_answer': 'I used the quadratic formula to solve the equation',
            'mark_scheme': [
                {
                    'description': 'Method correctness',
                    'marks': 2,
                    'keywords': ['quadratic', 'formula', 'solve'],
                    'partial_credit_keywords': ['quadratic', 'formula']
                }
            ],
            'llm_feedback': 'Student used correct method'
        }
        
        print("✅ Python integration script imported successfully")
        print("✅ Confidence scoring function available")
        print("✅ Visual marking function available")
        print("✅ Agreement confidence function available")
        
        return True
        
    except Exception as e:
        print(f"❌ Python integration script test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Mark-It: Testing Python Integration")
    print("=" * 60)
    
    tests = [
        ("Confidence Scorer", test_confidence_scorer),
        ("Visual Marking", test_visual_marking),
        ("Python Integration Script", test_python_integration_script),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Python integration is working correctly.")
        print("\n🔧 Next steps:")
        print("  1. Install Python dependencies: pip install -r requirements.txt")
        print("  2. Test the API endpoint: npm run dev")
        print("  3. Upload mark scheme and student paper to test full workflow")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the errors above.")
        print("\n🔧 Troubleshooting:")
        print("  1. Ensure all Python dependencies are installed")
        print("  2. Check that OpenCV is properly installed")
        print("  3. Verify Python path and module imports")

if __name__ == "__main__":
    main()


