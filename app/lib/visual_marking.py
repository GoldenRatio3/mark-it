"""
Visual Marking Module for Graph Paper Questions
Handles detection and grading of geometric shapes drawn on graph paper
"""

import cv2
import numpy as np
import math
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import json

@dataclass
class DetectedShape:
    """Represents a detected geometric shape from an image"""
    shape_type: str
    vertices: List[Tuple[float, float]]
    confidence: float
    bounding_box: Tuple[int, int, int, int]

@dataclass
class GeometricAccuracy:
    """Geometric accuracy measurements for visual questions"""
    scale_factor: float
    rotation_angle: float
    position_error: float
    overall_accuracy: float

class VisualMarker:
    """Main class for visual question marking"""
    
    def __init__(self, grid_spacing: float = 1.0, tolerance: float = 0.1):
        self.grid_spacing = grid_spacing
        self.tolerance = tolerance
        
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better shape detection"""
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Deskew image by detecting grid lines
        gray = self._deskew_image(gray)
        
        # Enhance contrast
        gray = cv2.equalizeHist(gray)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        
        # Remove noise
        kernel = np.ones((2, 2), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return binary
    
    def _deskew_image(self, gray: np.ndarray) -> np.ndarray:
        """Deskew image by detecting and aligning with grid lines"""
        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Detect lines using Hough transform
        lines = cv2.HoughLines(edges, 1, np.pi/180, 200)
        
        if lines is not None:
            # Find dominant horizontal and vertical lines
            horizontal_angles = []
            vertical_angles = []
            
            for line in lines:
                rho, theta = line[0]
                angle = theta * 180 / np.pi
                
                if abs(angle) < 10 or abs(angle - 90) < 10:
                    if abs(angle) < 10:
                        horizontal_angles.append(angle)
                    else:
                        vertical_angles.append(angle)
            
            # Calculate average skew
            if horizontal_angles:
                avg_skew = np.mean(horizontal_angles)
                # Apply rotation correction
                height, width = gray.shape
                center = (width // 2, height // 2)
                rotation_matrix = cv2.getRotationMatrix2D(center, -avg_skew, 1.0)
                gray = cv2.warpAffine(gray, rotation_matrix, (width, height))
        
        return gray
    
    def detect_shapes(self, binary_image: np.ndarray) -> List[DetectedShape]:
        """Detect geometric shapes in the binary image"""
        shapes = []
        
        # Find contours
        contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            # Approximate contour to reduce noise
            epsilon = 0.02 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Determine shape type based on number of vertices
            if len(approx) >= 3:
                shape_type = self._classify_shape(approx)
                vertices = [(point[0][0], point[0][1]) for point in approx]
                
                # Calculate confidence based on contour quality
                confidence = self._calculate_shape_confidence(contour, approx)
                
                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)
                bounding_box = (x, y, w, h)
                
                shape = DetectedShape(
                    shape_type=shape_type,
                    vertices=vertices,
                    confidence=confidence,
                    bounding_box=bounding_box
                )
                shapes.append(shape)
        
        return shapes
    
    def _classify_shape(self, approx: np.ndarray) -> str:
        """Classify shape based on number of vertices and properties"""
        num_vertices = len(approx)
        
        if num_vertices == 3:
            return "triangle"
        elif num_vertices == 4:
            # Check if it's a square/rectangle
            if self._is_rectangle(approx):
                return "rectangle"
            else:
                return "quadrilateral"
        elif num_vertices == 5:
            return "pentagon"
        elif num_vertices == 6:
            return "hexagon"
        elif num_vertices > 6:
            # Check if it's approximately circular
            if self._is_circle(approx):
                return "circle"
            else:
                return "polygon"
        else:
            return "unknown"
    
    def _is_rectangle(self, approx: np.ndarray) -> bool:
        """Check if quadrilateral is approximately rectangular"""
        if len(approx) != 4:
            return False
        
        # Calculate angles between adjacent edges
        angles = []
        for i in range(4):
            p1 = approx[i][0]
            p2 = approx[(i + 1) % 4][0]
            p3 = approx[(i + 2) % 4][0]
            
            v1 = p1 - p2
            v2 = p3 - p2
            
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            angle = np.arccos(np.clip(cos_angle, -1, 1))
            angles.append(angle * 180 / np.pi)
        
        # Check if angles are approximately 90 degrees
        return all(abs(angle - 90) < 15 for angle in angles)
    
    def _is_circle(self, approx: np.ndarray) -> bool:
        """Check if polygon is approximately circular"""
        if len(approx) < 6:
            return False
        
        # Calculate area and perimeter
        area = cv2.contourArea(approx)
        perimeter = cv2.arcLength(approx, True)
        
        # For a circle, area = π * (perimeter/(2π))²
        expected_area = math.pi * (perimeter / (2 * math.pi)) ** 2
        
        # Check if actual area is close to expected circular area
        circularity = area / expected_area if expected_area > 0 else 0
        return circularity > 0.7
    
    def _calculate_shape_confidence(self, contour: np.ndarray, approx: np.ndarray) -> float:
        """Calculate confidence score for detected shape"""
        # Compare original contour with approximation
        approx_contour = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        
        # Calculate similarity between original and approximated contour
        similarity = cv2.matchShapes(contour, approx_contour, cv2.CONTOURS_MATCH_I2, 0)
        
        # Convert similarity to confidence (lower similarity = higher confidence)
        confidence = max(0, 1 - similarity)
        
        # Additional factors
        area = cv2.contourArea(contour)
        if area < 100:  # Very small shapes get lower confidence
            confidence *= 0.8
        
        return min(1.0, confidence)
    
    def grade_geometric_accuracy(self, 
                                detected_shape: DetectedShape,
                                expected_shape: Dict) -> GeometricAccuracy:
        """Grade the geometric accuracy of a detected shape"""
        
        if detected_shape.shape_type != expected_shape.get('shape_type'):
            # Shape type mismatch
            return GeometricAccuracy(
                scale_factor=0.0,
                rotation_angle=0.0,
                position_error=float('inf'),
                overall_accuracy=0.0
            )
        
        # Convert pixel coordinates to grid coordinates
        grid_vertices = self._pixels_to_grid(detected_shape.vertices)
        expected_vertices = expected_shape.get('vertices', [])
        
        if not expected_vertices or len(grid_vertices) != len(expected_vertices):
            return GeometricAccuracy(
                scale_factor=0.0,
                rotation_angle=0.0,
                position_error=float('inf'),
                overall_accuracy=0.0
            )
        
        # Calculate scale factor
        scale_factor = self._calculate_scale_factor(grid_vertices, expected_vertices)
        
        # Calculate rotation angle
        rotation_angle = self._calculate_rotation_angle(grid_vertices, expected_vertices)
        
        # Calculate position error
        position_error = self._calculate_position_error(grid_vertices, expected_vertices)
        
        # Calculate overall accuracy
        overall_accuracy = self._calculate_overall_accuracy(
            scale_factor, rotation_angle, position_error, expected_shape
        )
        
        return GeometricAccuracy(
            scale_factor=scale_factor,
            rotation_angle=rotation_angle,
            position_error=position_error,
            overall_accuracy=overall_accuracy
        )
    
    def _pixels_to_grid(self, vertices: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Convert pixel coordinates to grid coordinates"""
        # This is a simplified conversion - in practice you'd need to calibrate
        # the grid spacing based on the actual image
        return [(x / self.grid_spacing, y / self.grid_spacing) for x, y in vertices]
    
    def _calculate_scale_factor(self, 
                               detected: List[Tuple[float, float]], 
                               expected: List[Tuple[float, float]]) -> float:
        """Calculate scale factor between detected and expected shapes"""
        if len(detected) < 2 or len(expected) < 2:
            return 1.0
        
        # Calculate distances between adjacent vertices
        detected_distances = []
        expected_distances = []
        
        for i in range(len(detected) - 1):
            d1 = math.dist(detected[i], detected[i + 1])
            d2 = math.dist(expected[i], expected[i + 1])
            detected_distances.append(d1)
            expected_distances.append(d2)
        
        # Calculate scale factor as ratio of average distances
        if expected_distances and any(d > 0 for d in expected_distances):
            avg_detected = np.mean([d for d in detected_distances if d > 0])
            avg_expected = np.mean([d for d in expected_distances if d > 0])
            return avg_detected / avg_expected if avg_expected > 0 else 1.0
        
        return 1.0
    
    def _calculate_rotation_angle(self, 
                                 detected: List[Tuple[float, float]], 
                                 expected: List[Tuple[float, float]]) -> float:
        """Calculate rotation angle between detected and expected shapes"""
        if len(detected) < 2 or len(expected) < 2:
            return 0.0
        
        # Calculate vectors from first vertex to others
        detected_vectors = []
        expected_vectors = []
        
        for i in range(1, len(detected)):
            v1 = (detected[i][0] - detected[0][0], detected[i][1] - detected[0][1])
            v2 = (expected[i][0] - expected[0][0], expected[i][1] - expected[0][1])
            detected_vectors.append(v1)
            expected_vectors.append(v2)
        
        # Calculate average rotation angle
        angles = []
        for d_vec, e_vec in zip(detected_vectors, expected_vectors):
            if any(d_vec) and any(e_vec):  # Check for non-zero vectors
                cos_angle = np.dot(d_vec, e_vec) / (np.linalg.norm(d_vec) * np.linalg.norm(e_vec))
                cos_angle = np.clip(cos_angle, -1, 1)
                angle = np.arccos(cos_angle) * 180 / np.pi
                angles.append(angle)
        
        return np.mean(angles) if angles else 0.0
    
    def _calculate_position_error(self, 
                                 detected: List[Tuple[float, float]], 
                                 expected: List[Tuple[float, float]]) -> float:
        """Calculate average position error between corresponding vertices"""
        if len(detected) != len(expected):
            return float('inf')
        
        errors = []
        for d_vertex, e_vertex in zip(detected, expected):
            error = math.dist(d_vertex, e_vertex)
            errors.append(error)
        
        return np.mean(errors) if errors else float('inf')
    
    def _calculate_overall_accuracy(self, 
                                   scale_factor: float, 
                                   rotation_angle: float, 
                                   position_error: float,
                                   expected_shape: Dict) -> float:
        """Calculate overall accuracy score based on geometric measurements"""
        
        # Get tolerance values from expected shape
        tolerances = expected_shape.get('tolerance', {})
        scale_tolerance = tolerances.get('scale', 0.1)
        rotation_tolerance = tolerances.get('rotation', 5.0)  # degrees
        position_tolerance = tolerances.get('position', 1.0)  # grid units
        
        # Calculate individual scores
        scale_score = max(0, 1 - abs(scale_factor - 1.0) / scale_tolerance)
        rotation_score = max(0, 1 - abs(rotation_angle) / rotation_tolerance)
        position_score = max(0, 1 - position_error / position_tolerance)
        
        # Weight the scores (you can adjust these weights)
        weights = [0.3, 0.3, 0.4]  # scale, rotation, position
        
        overall_score = (
            scale_score * weights[0] +
            rotation_score * weights[1] +
            position_score * weights[2]
        )
        
        return max(0, min(1, overall_score))
    
    def mark_visual_question(self, 
                            image_path: str, 
                            expected_answer: Dict) -> Dict:
        """Main method to mark a visual question"""
        
        try:
            # Preprocess image
            binary_image = self.preprocess_image(image_path)
            
            # Detect shapes
            detected_shapes = self.detect_shapes(binary_image)
            
            if not detected_shapes:
                return {
                    'confidence': 0.0,
                    'feedback': 'No shapes detected in the image',
                    'geometric_accuracy': None,
                    'detected_shapes': []
                }
            
            # Find the best matching shape
            best_shape = max(detected_shapes, key=lambda s: s.confidence)
            
            # Grade geometric accuracy
            geometric_accuracy = self.grade_geometric_accuracy(best_shape, expected_answer)
            
            # Generate feedback
            feedback = self._generate_visual_feedback(
                best_shape, geometric_accuracy, expected_answer
            )
            
            return {
                'confidence': geometric_accuracy.overall_accuracy,
                'feedback': feedback,
                'geometric_accuracy': {
                    'scale_factor': geometric_accuracy.scale_factor,
                    'rotation_angle': geometric_accuracy.rotation_angle,
                    'position_error': geometric_accuracy.position_error,
                    'overall_accuracy': geometric_accuracy.overall_accuracy
                },
                'detected_shapes': [
                    {
                        'type': shape.shape_type,
                        'vertices': shape.vertices,
                        'confidence': shape.confidence
                    }
                    for shape in detected_shapes
                ]
            }
            
        except Exception as e:
            return {
                'confidence': 0.0,
                'feedback': f'Error processing image: {str(e)}',
                'geometric_accuracy': None,
                'detected_shapes': []
            }
    
    def _generate_visual_feedback(self, 
                                 detected_shape: DetectedShape,
                                 accuracy: GeometricAccuracy,
                                 expected: Dict) -> str:
        """Generate human-readable feedback for visual questions"""
        
        feedback_parts = []
        
        # Shape type feedback
        if detected_shape.shape_type != expected.get('shape_type'):
            feedback_parts.append(
                f"Expected a {expected.get('shape_type', 'shape')}, but detected a {detected_shape.shape_type}"
            )
        
        # Scale feedback
        if abs(accuracy.scale_factor - 1.0) > 0.1:
            if accuracy.scale_factor > 1.0:
                feedback_parts.append("The shape is drawn too large")
            else:
                feedback_parts.append("The shape is drawn too small")
        
        # Rotation feedback
        if abs(accuracy.rotation_angle) > 5.0:
            feedback_parts.append(f"The shape is rotated by {accuracy.rotation_angle:.1f}° from the expected orientation")
        
        # Position feedback
        if accuracy.position_error > 1.0:
            feedback_parts.append("The shape is not positioned correctly on the grid")
        
        if not feedback_parts:
            return "Excellent! The shape is drawn correctly with proper scale, rotation, and position."
        
        return ". ".join(feedback_parts) + "."

# Example usage and testing
if __name__ == "__main__":
    # Example expected answer for a triangle question
    expected_triangle = {
        'shape_type': 'triangle',
        'vertices': [[2, 2], [4, 6], [7, 3]],
        'tolerance': {
            'scale': 0.1,
            'rotation': 5.0,
            'position': 1.0
        }
    }
    
    # Initialize visual marker
    marker = VisualMarker(grid_spacing=50.0)  # 50 pixels per grid unit
    
    # Test with an image (you would need to provide an actual image path)
    # result = marker.mark_visual_question("student_answer.jpg", expected_triangle)
    # print(json.dumps(result, indent=2))
