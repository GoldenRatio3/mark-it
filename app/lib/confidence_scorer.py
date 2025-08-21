"""
Improved Confidence Scoring System
Addresses the "always 1" confidence problem by using measurable criteria instead of LLM self-assessment
"""

import re
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import json

@dataclass
class Criterion:
    """Represents a single marking criterion"""
    description: str
    marks: int
    keywords: List[str]
    partial_credit_keywords: Optional[List[str]] = None
    tolerance: float = 0.1

@dataclass
class ConfidenceBreakdown:
    """Detailed breakdown of confidence scoring"""
    criteria_matched: int
    total_criteria: int
    confidence_score: float
    partial_credit_details: List[Dict]
    reasoning: str

class ConfidenceScorer:
    """Main class for calculating confidence scores based on criteria matching"""
    
    def __init__(self):
        self.partial_credit_threshold = 0.6  # Minimum score for partial credit
        
    def calculate_confidence_from_criteria(self, 
                                         student_answer: str,
                                         mark_scheme: List[Criterion],
                                         llm_feedback: str) -> ConfidenceBreakdown:
        """
        Calculate confidence based on how many criteria are actually met
        instead of relying on LLM self-assessment
        """
        
        matched_criteria = []
        partial_credit_details = []
        
        # Analyze each criterion
        for criterion in mark_scheme:
            match_result = self._check_criterion_match(
                student_answer, criterion, llm_feedback
            )
            
            if match_result['fully_matched']:
                matched_criteria.append(criterion)
            elif match_result['partially_matched']:
                partial_credit_details.append({
                    'criterion': criterion.description,
                    'matched': True,
                    'partial_score': match_result['partial_score'],
                    'explanation': match_result['explanation']
                })
        
        # Calculate confidence score
        total_criteria = len(mark_scheme)
        criteria_matched = len(matched_criteria)
        
        # Add partial credit to the score
        partial_credit_score = sum(detail['partial_score'] for detail in partial_credit_details)
        total_score = criteria_matched + partial_credit_score
        
        # Normalize to 0-1 range
        confidence_score = min(1.0, total_score / total_criteria)
        
        # Generate reasoning
        reasoning = self._generate_confidence_reasoning(
            criteria_matched, total_criteria, partial_credit_details, confidence_score
        )
        
        return ConfidenceBreakdown(
            criteria_matched=criteria_matched,
            total_criteria=total_criteria,
            confidence_score=confidence_score,
            partial_credit_details=partial_credit_details,
            reasoning=reasoning
        )
    
    def _check_criterion_match(self, 
                              student_answer: str, 
                              criterion: Criterion,
                              llm_feedback: str) -> Dict:
        """Check if a specific criterion is met by the student answer"""
        
        # Convert to lowercase for comparison
        answer_lower = student_answer.lower()
        feedback_lower = llm_feedback.lower()
        
        # Check for exact keyword matches
        keyword_matches = sum(1 for keyword in criterion.keywords 
                            if keyword.lower() in answer_lower)
        
        # Check for partial credit keywords
        partial_matches = 0
        if criterion.partial_credit_keywords:
            partial_matches = sum(1 for keyword in criterion.partial_credit_keywords 
                                if keyword.lower() in answer_lower)
        
        # Calculate match percentage
        total_keywords = len(criterion.keywords)
        match_percentage = keyword_matches / total_keywords if total_keywords > 0 else 0
        
        # Determine if fully matched
        fully_matched = match_percentage >= (1 - criterion.tolerance)
        
        # Determine if partially matched
        partially_matched = (match_percentage >= self.partial_credit_threshold and 
                           not fully_matched)
        
        # Calculate partial score
        partial_score = 0.0
        if partially_matched:
            partial_score = match_percentage * criterion.marks
        
        # Generate explanation
        explanation = self._generate_criterion_explanation(
            criterion, keyword_matches, total_keywords, partial_matches
        )
        
        return {
            'fully_matched': fully_matched,
            'partially_matched': partially_matched,
            'match_percentage': match_percentage,
            'partial_score': partial_score,
            'explanation': explanation
        }
    
    def _generate_criterion_explanation(self, 
                                       criterion: Criterion,
                                       keyword_matches: int,
                                       total_keywords: int,
                                       partial_matches: int) -> str:
        """Generate explanation for criterion matching"""
        
        if keyword_matches == total_keywords:
            return f"All required keywords found: {', '.join(criterion.keywords)}"
        elif keyword_matches > 0:
            found_keywords = [kw for kw in criterion.keywords 
                            if kw.lower() in criterion.description.lower()]
            missing_keywords = [kw for kw in criterion.keywords 
                              if kw.lower() not in criterion.description.lower()]
            
            return (f"Found {keyword_matches}/{total_keywords} keywords. "
                   f"Found: {', '.join(found_keywords)}. "
                   f"Missing: {', '.join(missing_keywords)}")
        else:
            return f"No required keywords found. Expected: {', '.join(criterion.keywords)}"
    
    def _generate_confidence_reasoning(self, 
                                      criteria_matched: int,
                                      total_criteria: int,
                                      partial_credit_details: List[Dict],
                                      confidence_score: float) -> str:
        """Generate human-readable reasoning for the confidence score"""
        
        if confidence_score >= 0.9:
            return (f"High confidence: {criteria_matched}/{total_criteria} criteria fully met. "
                   f"Strong evidence supports this marking decision.")
        elif confidence_score >= 0.7:
            return (f"Good confidence: {criteria_matched}/{total_criteria} criteria fully met "
                   f"with {len(partial_credit_details)} partial matches. "
                   f"Marking decision is well-supported.")
        elif confidence_score >= 0.5:
            return (f"Moderate confidence: {criteria_matched}/{total_criteria} criteria met. "
                   f"Some uncertainty exists; consider human review.")
        else:
            return (f"Low confidence: Only {criteria_matched}/{total_criteria} criteria met. "
                   f"High uncertainty; human review recommended.")
    
    def calculate_embedding_confidence(self, 
                                     student_answer: str,
                                     expected_answer: str,
                                     embedding_similarity: float) -> float:
        """
        Calculate confidence based on semantic similarity between
        student answer and expected answer
        """
        
        # Normalize embedding similarity to 0-1 range
        # Assuming embedding_similarity is already in this range
        base_confidence = embedding_similarity
        
        # Apply additional factors that might affect confidence
        
        # Length similarity factor
        student_length = len(student_answer.split())
        expected_length = len(expected_answer.split())
        
        if expected_length > 0:
            length_ratio = min(student_length / expected_length, expected_length / student_length)
            length_factor = length_ratio * 0.2  # 20% weight for length
        else:
            length_factor = 0
        
        # Keyword presence factor
        expected_words = set(expected_answer.lower().split())
        student_words = set(student_answer.lower().split())
        
        if expected_words:
            keyword_overlap = len(expected_words.intersection(student_words)) / len(expected_words)
            keyword_factor = keyword_overlap * 0.3  # 30% weight for keywords
        else:
            keyword_factor = 0
        
        # Final confidence combines all factors
        final_confidence = (base_confidence * 0.5 +  # 50% weight for embedding
                           length_factor + 
                           keyword_factor)
        
        return min(1.0, max(0.0, final_confidence))
    
    def calculate_model_agreement_confidence(self, 
                                           marking_results: List[Dict]) -> float:
        """
        Calculate confidence based on agreement between multiple model runs
        or different marking approaches
        """
        
        if not marking_results:
            return 0.0
        
        # Extract marks from different runs
        marks_list = [result.get('marks_awarded', 0) for result in marking_results]
        total_marks_list = [result.get('total_marks', 1) for result in marking_results]
        
        # Calculate percentage scores
        percentage_scores = []
        for marks, total in zip(marks_list, total_marks_list):
            if total > 0:
                percentage_scores.append(marks / total)
        
        if not percentage_scores:
            return 0.0
        
        # Calculate standard deviation of scores
        mean_score = sum(percentage_scores) / len(percentage_scores)
        variance = sum((score - mean_score) ** 2 for score in percentage_scores) / len(percentage_scores)
        std_dev = math.sqrt(variance)
        
        # Higher agreement (lower std dev) = higher confidence
        # Normalize to 0-1 range
        agreement_confidence = max(0, 1 - (std_dev * 2))  # Scale factor of 2
        
        return min(1.0, agreement_confidence)
    
    def calculate_geometric_confidence(self, 
                                     geometric_accuracy: Dict) -> float:
        """
        Calculate confidence for visual/geometric questions based on
        measurable geometric properties
        """
        
        if not geometric_accuracy:
            return 0.0
        
        # Extract geometric measurements
        scale_factor = geometric_accuracy.get('scale_factor', 1.0)
        rotation_angle = geometric_accuracy.get('rotation_angle', 0.0)
        position_error = geometric_accuracy.get('position_error', 0.0)
        
        # Calculate individual confidence scores
        scale_confidence = max(0, 1 - abs(scale_factor - 1.0) / 0.2)  # 20% tolerance
        rotation_confidence = max(0, 1 - abs(rotation_angle) / 10.0)  # 10° tolerance
        position_confidence = max(0, 1 - position_error / 2.0)  # 2 grid units tolerance
        
        # Weight the factors
        weights = [0.3, 0.3, 0.4]  # scale, rotation, position
        
        geometric_confidence = (
            scale_confidence * weights[0] +
            rotation_confidence * weights[1] +
            position_confidence * weights[2]
        )
        
        return min(1.0, geometric_confidence)
    
    def combine_confidence_scores(self, 
                                 confidence_scores: List[float],
                                 weights: Optional[List[float]] = None) -> float:
        """
        Combine multiple confidence scores into a single weighted score
        """
        
        if not confidence_scores:
            return 0.0
        
        if weights is None:
            # Equal weights if none specified
            weights = [1.0 / len(confidence_scores)] * len(confidence_scores)
        
        # Ensure weights sum to 1
        total_weight = sum(weights)
        if total_weight > 0:
            normalized_weights = [w / total_weight for w in weights]
        else:
            normalized_weights = [1.0 / len(weights)] * len(weights)
        
        # Calculate weighted average
        combined_confidence = sum(score * weight 
                                for score, weight in zip(confidence_scores, normalized_weights))
        
        return min(1.0, max(0.0, combined_confidence))

# Example usage
if __name__ == "__main__":
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
    
    # Example student answer
    student_answer = "I used the quadratic formula to solve the equation and got x = 2"
    
    # Example LLM feedback
    llm_feedback = "Student used correct method but made calculation error"
    
    # Initialize scorer
    scorer = ConfidenceScorer()
    
    # Calculate confidence
    confidence = scorer.calculate_confidence_from_criteria(
        student_answer, mark_scheme, llm_feedback
    )
    
    print(f"Confidence Score: {confidence.confidence_score:.3f}")
    print(f"Criteria Met: {confidence.criteria_matched}/{confidence.total_criteria}")
    print(f"Reasoning: {confidence.reasoning}")
    
    # Example of combining multiple confidence scores
    criteria_confidence = confidence.confidence_score
    embedding_confidence = 0.85
    geometric_confidence = 0.92
    
    combined_confidence = scorer.combine_confidence_scores(
        [criteria_confidence, embedding_confidence, geometric_confidence],
        weights=[0.5, 0.3, 0.2]  # 50% criteria, 30% embedding, 20% geometric
    )
    
    print(f"\nCombined Confidence: {combined_confidence:.3f}")
