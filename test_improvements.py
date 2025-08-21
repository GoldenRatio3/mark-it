#!/usr/bin/env python3
"""
Test script to demonstrate the improved confidence scoring and visual marking capabilities
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'lib'))

from confidence_scorer import ConfidenceScorer, Criterion
from visual_marking import VisualMarker

def test_confidence_scoring():
    """Test the improved confidence scoring system"""
    print("🧪 Testing Improved Confidence Scoring")
    print("=" * 50)
    
    # Initialize confidence scorer
    scorer = ConfidenceScorer()
    
    # Example mark scheme criteria
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
    
    # Test case 1: Good answer
    print("\n📝 Test Case 1: Good Answer")
    student_answer_1 = "I used the quadratic formula to solve the equation x² + 5x + 6 = 0. I substituted the values a=1, b=5, c=6 and got the answer x = -2 or x = -3."
    llm_feedback_1 = "Student used correct method, substituted values correctly, and got the right answer."
    
    confidence_1 = scorer.calculate_confidence_from_criteria(
        student_answer_1, mark_scheme, llm_feedback_1
    )
    
    print(f"Student Answer: {student_answer_1[:100]}...")
    print(f"Confidence Score: {confidence_1.confidence_score:.3f}")
    print(f"Criteria Met: {confidence_1.criteria_matched}/{confidence_1.total_criteria}")
    print(f"Reasoning: {confidence_1.reasoning}")
    
    # Test case 2: Partial answer
    print("\n📝 Test Case 2: Partial Answer")
    student_answer_2 = "I used the quadratic formula to solve the equation but made a mistake in the calculation."
    llm_feedback_2 = "Student used correct method but made calculation error."
    
    confidence_2 = scorer.calculate_confidence_from_criteria(
        student_answer_2, mark_scheme, llm_feedback_2
    )
    
    print(f"Student Answer: {student_answer_2}")
    print(f"Confidence Score: {confidence_2.confidence_score:.3f}")
    print(f"Criteria Met: {confidence_2.criteria_matched}/{confidence_2.total_criteria}")
    print(f"Reasoning: {confidence_2.reasoning}")
    
    # Test case 3: Poor answer
    print("\n📝 Test Case 3: Poor Answer")
    student_answer_3 = "I tried to solve it but I'm not sure about the method."
    llm_feedback_3 = "Student's approach is unclear and no correct method demonstrated."
    
    confidence_3 = scorer.calculate_confidence_from_criteria(
        student_answer_3, mark_scheme, llm_feedback_3
    )
    
    print(f"Student Answer: {student_answer_3}")
    print(f"Confidence Score: {confidence_3.confidence_score:.3f}")
    print(f"Criteria Met: {confidence_3.criteria_matched}/{confidence_3.total_criteria}")
    print(f"Reasoning: {confidence_3.reasoning}")
    
    # Test combining multiple confidence scores
    print("\n🔄 Testing Combined Confidence Scoring")
    criteria_confidence = confidence_1.confidence_score
    embedding_confidence = 0.85
    geometric_confidence = 0.92
    
    combined_confidence = scorer.combine_confidence_scores(
        [criteria_confidence, embedding_confidence, geometric_confidence],
        weights=[0.5, 0.3, 0.2]  # 50% criteria, 30% embedding, 20% geometric
    )
    
    print(f"Individual Scores: Criteria={criteria_confidence:.3f}, Embedding={embedding_confidence:.3f}, Geometric={geometric_confidence:.3f}")
    print(f"Combined Confidence: {combined_confidence:.3f}")

def test_visual_marking():
    """Test the visual marking capabilities"""
    print("\n\n🔍 Testing Visual Marking System")
    print("=" * 50)
    
    # Initialize visual marker
    marker = VisualMarker(grid_spacing=50.0)
    
    # Example expected answer for a triangle question
    expected_triangle = {
        'shape_type': 'triangle',
        'vertices': [[2, 2], [4, 6], [7, 3]],
        'tolerance': {
            'scale': 0.1,      # 10% tolerance
            'rotation': 5.0,   # 5° tolerance
            'position': 1.0    # 1 grid unit tolerance
        }
    }
    
    print("Expected Triangle Configuration:")
    print(f"  Shape Type: {expected_triangle['shape_type']}")
    print(f"  Vertices: {expected_triangle['vertices']}")
    print(f"  Scale Tolerance: ±{expected_triangle['tolerance']['scale']*100}%")
    print(f"  Rotation Tolerance: ±{expected_triangle['tolerance']['rotation']}°")
    print(f"  Position Tolerance: ±{expected_triangle['tolerance']['position']} grid units")
    
    # Test geometric accuracy calculation
    print("\n🧮 Testing Geometric Accuracy Calculation")
    
    # Simulate detected shape (in practice, this would come from image processing)
    detected_triangle = {
        'shape_type': 'triangle',
        'vertices': [[2.1, 2.0], [4.0, 6.1], [7.0, 3.0]]
    }
    
    # Calculate geometric accuracy
    geometric_accuracy = marker._calculate_overall_accuracy(
        scale_factor=1.05,      # 5% larger than expected
        rotation_angle=2.0,     # 2° rotation
        position_error=0.5,     # 0.5 grid units position error
        expected_shape=expected_triangle
    )
    
    print(f"Detected Triangle: {detected_triangle['vertices']}")
    print(f"Scale Factor: 1.05 (5% larger)")
    print(f"Rotation Angle: 2.0°")
    print(f"Position Error: 0.5 grid units")
    print(f"Overall Accuracy: {geometric_accuracy:.3f}")
    
    # Test confidence calculation for geometric questions
    print("\n🎯 Testing Geometric Confidence Scoring")
    geometric_confidence = marker._calculate_overall_accuracy(
        scale_factor=1.05,
        rotation_angle=2.0,
        position_error=0.5,
        expected_shape=expected_triangle
    )
    
    print(f"Geometric Confidence: {geometric_confidence:.3f}")
    
    if geometric_confidence >= 0.8:
        print("✅ High confidence - shape meets most criteria")
    elif geometric_confidence >= 0.6:
        print("⚠️  Medium confidence - some criteria not met")
    else:
        print("❌ Low confidence - significant deviations detected")

def test_model_agreement():
    """Test model agreement confidence scoring"""
    print("\n\n🤝 Testing Model Agreement Confidence")
    print("=" * 50)
    
    scorer = ConfidenceScorer()
    
    # Simulate multiple marking runs
    marking_results = [
        {'marks_awarded': 3, 'total_marks': 4},
        {'marks_awarded': 3, 'total_marks': 4},
        {'marks_awarded': 2, 'total_marks': 4},
        {'marks_awarded': 3, 'total_marks': 4},
    ]
    
    agreement_confidence = scorer.calculate_model_agreement_confidence(marking_results)
    
    print("Multiple Marking Runs:")
    for i, result in enumerate(marking_results, 1):
        percentage = (result['marks_awarded'] / result['total_marks']) * 100
        print(f"  Run {i}: {result['marks_awarded']}/{result['total_marks']} ({percentage:.1f}%)")
    
    print(f"\nAgreement Confidence: {agreement_confidence:.3f}")
    
    if agreement_confidence >= 0.8:
        print("✅ High agreement - marking is consistent")
    elif agreement_confidence >= 0.6:
        print("⚠️  Medium agreement - some variation in marking")
    else:
        print("❌ Low agreement - significant marking variation")

def main():
    """Run all tests"""
    print("🚀 Mark-It: Testing Improved Features")
    print("=" * 60)
    
    try:
        test_confidence_scoring()
        test_visual_marking()
        test_model_agreement()
        
        print("\n\n✅ All tests completed successfully!")
        print("\n🎉 Key Improvements Demonstrated:")
        print("  • Objective confidence scoring (no more 'always 1')")
        print("  • Multi-factor confidence calculation")
        print("  • Visual question support with geometric accuracy")
        print("  • Model agreement confidence")
        print("  • Teacher review workflow components")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
