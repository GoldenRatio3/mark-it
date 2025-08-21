#!/usr/bin/env python3
"""
Python Integration Script for Mark-It API
This script provides a command-line interface for the confidence scorer and visual marking modules
"""

import sys
import json
import argparse
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

def run_confidence_scoring(args):
    """Run confidence scoring analysis"""
    try:
        # Lazy imports to avoid unnecessary hard dependencies (e.g., cv2)
        from confidence_scorer import ConfidenceScorer, Criterion
        # Parse input data
        if args.input_file:
            with open(args.input_file, 'r') as f:
                data = json.load(f)
        else:
            data = json.loads(args.input_data)
        
        # Extract parameters
        student_answer = data.get('student_answer', '')
        mark_scheme_data = data.get('mark_scheme', [])
        llm_feedback = data.get('llm_feedback', '')
        
        # Convert mark scheme data to Criterion objects
        mark_scheme = []
        for criterion_data in mark_scheme_data:
            criterion = Criterion(
                description=criterion_data.get('description', ''),
                marks=criterion_data.get('marks', 1),
                keywords=criterion_data.get('keywords', []),
                partial_credit_keywords=criterion_data.get('partial_credit_keywords', []),
                tolerance=criterion_data.get('tolerance', 0.1)
            )
            mark_scheme.append(criterion)
        
        # Initialize confidence scorer
        scorer = ConfidenceScorer()
        
        # Calculate confidence
        confidence_result = scorer.calculate_confidence_from_criteria(
            student_answer, mark_scheme, llm_feedback
        )
        
        # Prepare output
        output = {
            'confidence_score': confidence_result.confidence_score,
            'criteria_matched': confidence_result.criteria_matched,
            'total_criteria': confidence_result.total_criteria,
            'partial_credit_details': confidence_result.partial_credit_details,
            'reasoning': confidence_result.reasoning,
            'success': True
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        error_output = {
            'success': False,
            'error': str(e),
            'confidence_score': 0.5,
            'criteria_matched': 0,
            'total_criteria': 1,
            'partial_credit_details': [],
            'reasoning': f'Error occurred: {str(e)}'
        }
        print(json.dumps(error_output, indent=2))

def run_visual_marking(args):
    """Run visual marking analysis"""
    try:
        # Import only when visual mode is requested to avoid cv2 requirement for other modes
        from visual_marking import VisualMarker
        # Parse input data
        if args.input_file:
            with open(args.input_file, 'r') as f:
                data = json.load(f)
        else:
            data = json.loads(args.input_data)
        
        # Extract parameters
        image_path = data.get('image_path', '')
        expected_answer = data.get('expected_answer', {})
        grid_spacing = data.get('grid_spacing', 50.0)
        
        # Initialize visual marker
        marker = VisualMarker(grid_spacing=grid_spacing)
        
        # Mark visual question
        result = marker.mark_visual_question(image_path, expected_answer)
        
        # Prepare output
        output = {
            'success': True,
            'confidence': result['confidence'],
            'feedback': result['feedback'],
            'geometric_accuracy': result.get('geometric_accuracy'),
            'detected_shapes': result.get('detected_shapes', [])
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        error_output = {
            'success': False,
            'error': str(e),
            'confidence': 0.0,
            'feedback': f'Error occurred: {str(e)}',
            'geometric_accuracy': None,
            'detected_shapes': []
        }
        print(json.dumps(error_output, indent=2))

def run_agreement_confidence(args):
    """Run model agreement confidence calculation"""
    try:
        # Lazy import to avoid importing visual dependencies
        from confidence_scorer import ConfidenceScorer
        # Parse input data
        if args.input_file:
            with open(args.input_file, 'r') as f:
                data = json.load(f)
        else:
            data = json.loads(args.input_data)

        # Expect a list of { marks_awarded, total_marks }
        marking_results = data.get('marking_results', [])

        scorer = ConfidenceScorer()
        confidence = scorer.calculate_model_agreement_confidence(marking_results)

        output = {
            'success': True,
            'confidence_score': confidence
        }

        print(json.dumps(output, indent=2))

    except Exception as e:
        error_output = {
            'success': False,
            'error': str(e),
            'confidence_score': 0.0
        }
        print(json.dumps(error_output, indent=2))

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Mark-It Python Integration Script')
    parser.add_argument('--mode', choices=['confidence', 'visual', 'agreement'], required=True,
                       help='Mode to run: confidence scoring or visual marking')
    parser.add_argument('--input-file', help='Path to input JSON file')
    parser.add_argument('--input-data', help='Input JSON data as string')
    parser.add_argument('--output-file', help='Path to output JSON file')
    
    args = parser.parse_args()
    
    # Validate input
    if not args.input_file and not args.input_data:
        print(json.dumps({
            'success': False,
            'error': 'Either --input-file or --input-data must be provided'
        }, indent=2))
        sys.exit(1)
    
    # Run appropriate mode
    if args.mode == 'confidence':
        run_confidence_scoring(args)
    elif args.mode == 'visual':
        run_visual_marking(args)
    elif args.mode == 'agreement':
        run_agreement_confidence(args)
    
    # Redirect output to file if specified
    if args.output_file:
        with open(args.output_file, 'w') as f:
            f.write(sys.stdout.getvalue())

if __name__ == '__main__':
    main()


