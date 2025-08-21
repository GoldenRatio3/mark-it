'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkResult } from '@/lib/schemas';

interface TeacherReviewProps {
	markingResult: MarkResult;
	onApprove: (questionNumber: number) => void;
	onOverride: (questionNumber: number, override: any) => void;
	onBatchApprove: (confidenceThreshold: number) => void;
	approvedQuestionNumbers?: Set<number>;
}

export function TeacherReview({
	markingResult,
	onApprove,
	onOverride,
	onBatchApprove,
	approvedQuestionNumbers,
}: TeacherReviewProps) {
	const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
	const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
		new Set()
	);

	const toggleQuestionExpansion = (questionNumber: number) => {
		const newExpanded = new Set(expandedQuestions);
		if (newExpanded.has(questionNumber)) {
			newExpanded.delete(questionNumber);
		} else {
			newExpanded.add(questionNumber);
		}
		setExpandedQuestions(newExpanded);
	};

	const getConfidenceColor = (confidence: number) => {
		if (confidence >= 0.8) return 'bg-green-100 text-green-800';
		if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	};

	const getConfidenceLabel = (confidence: number) => {
		if (confidence >= 0.8) return 'High';
		if (confidence >= 0.6) return 'Medium';
		return 'Low';
	};

	const highConfidenceQuestions = markingResult.results.filter(
		(q) => q.confidence >= confidenceThreshold
	).length;

	const totalQuestions = markingResult.results.length;

	return (
		<div className="space-y-6">
			{/* Header with batch actions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Teacher Review Dashboard</span>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-600">
									Confidence Threshold:
								</span>
								<input
									type="range"
									min="0.5"
									max="1.0"
									step="0.05"
									value={confidenceThreshold}
									onChange={(e) =>
										setConfidenceThreshold(parseFloat(e.target.value))
									}
									className="w-24"
								/>
								<span className="text-sm font-mono">{confidenceThreshold}</span>
							</div>
							<Button
								onClick={() => onBatchApprove(confidenceThreshold)}
								className="bg-green-600 hover:bg-green-700"
							>
								Batch Approve High Confidence ({highConfidenceQuestions}/
								{totalQuestions})
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-3 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{highConfidenceQuestions}
							</div>
							<div className="text-sm text-gray-600">High Confidence</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-yellow-600">
								{totalQuestions - highConfidenceQuestions}
							</div>
							<div className="text-sm text-gray-600">Need Review</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{markingResult.overall_confidence?.toFixed(2) || 'N/A'}
							</div>
							<div className="text-sm text-gray-600">Overall Confidence</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Question Review List */}
			<div className="space-y-4">
				{markingResult.results.map((question) => (
					<QuestionReviewCard
						key={question.question_number}
						question={question}
						isExpanded={expandedQuestions.has(question.question_number)}
						onToggleExpansion={() =>
							toggleQuestionExpansion(question.question_number)
						}
						onApprove={() => onApprove(question.question_number)}
						onOverride={onOverride}
						isApproved={
							approvedQuestionNumbers?.has(question.question_number) ?? false
						}
					/>
				))}
			</div>
		</div>
	);
}

interface QuestionReviewCardProps {
	question: any;
	isExpanded: boolean;
	onToggleExpansion: () => void;
	onApprove: () => void;
	onOverride: (questionNumber: number, override: any) => void;
	isApproved: boolean;
}

function QuestionReviewCard({
	question,
	isExpanded,
	onToggleExpansion,
	onApprove,
	onOverride,
	isApproved,
}: QuestionReviewCardProps) {
	const [showOverrideForm, setShowOverrideForm] = useState(false);
	const [overrideMarks, setOverrideMarks] = useState(question.marks_awarded);
	const [overrideFeedback, setOverrideFeedback] = useState(question.feedback);
	const [overrideReason, setOverrideReason] = useState('');

	const getConfidenceColor = (confidence: number) => {
		if (confidence >= 0.8) return 'bg-green-100 text-green-800';
		if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	};

	const getConfidenceLabel = (confidence: number) => {
		if (confidence >= 0.8) return 'High';
		if (confidence >= 0.6) return 'Medium';
		return 'Low';
	};

	const handleOverride = () => {
		onOverride(question.question_number, {
			marks_awarded: overrideMarks,
			feedback: overrideFeedback,
			reason: overrideReason,
		});
		setShowOverrideForm(false);
	};

	return (
		<Card
			className={`transition-all duration-200 ${
				question.confidence < 0.7 ? 'border-orange-300 bg-orange-50' : ''
			}`}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<CardTitle className="text-lg">
							Question {question.question_number}
						</CardTitle>
						<Badge
							variant="outline"
							className={getConfidenceColor(question.confidence)}
						>
							{getConfidenceLabel(question.confidence)} Confidence
						</Badge>
						<Badge variant="secondary">
							{question.question_type || 'text'}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={onToggleExpansion}>
							{isExpanded ? 'Collapse' : 'Expand'}
						</Button>
						<Button
							onClick={onApprove}
							className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
							size="sm"
							disabled={isApproved}
						>
							{isApproved ? 'Approved' : 'Approve'}
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Basic Question Info */}
				<div className="grid grid-cols-3 gap-4 text-sm">
					<div>
						<span className="font-medium">Marks Awarded:</span>
						<span className="ml-2 font-mono">
							{question.marks_awarded}/{question.total_marks}
						</span>
					</div>
					<div>
						<span className="font-medium">Confidence:</span>
						<span className="ml-2 font-mono">
							{(question.confidence * 100).toFixed(1)}%
						</span>
					</div>
					<div>
						<span className="font-medium">Question Type:</span>
						<span className="ml-2 capitalize">
							{question.question_type || 'text'}
						</span>
					</div>
				</div>

				{/* Confidence Breakdown */}
				{question.confidence_breakdown && (
					<div className="bg-gray-50 p-3 rounded-lg">
						<h4 className="font-medium text-sm mb-2">Confidence Breakdown</h4>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<span className="text-sm">Criteria Matched:</span>
								<span className="font-mono">
									{question.confidence_breakdown.criteria_matched}/
									{question.confidence_breakdown.total_criteria}
								</span>
							</div>
							<Progress
								value={
									(question.confidence_breakdown.criteria_matched /
										question.confidence_breakdown.total_criteria) *
									100
								}
								className="h-2"
							/>
						</div>
					</div>
				)}

				{/* AI Feedback */}
				<div>
					<h4 className="font-medium text-sm mb-2">AI Feedback</h4>
					<p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
						{question.feedback}
					</p>
				</div>

				{/* Visual Analysis (if applicable) */}
				{question.visual_analysis && question.question_type !== 'text' && (
					<div className="bg-purple-50 p-3 rounded-lg">
						<h4 className="font-medium text-sm mb-2">Visual Analysis</h4>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="font-medium">Detected Shapes:</span>
								<span className="ml-2">
									{question.visual_analysis.detected_shapes?.length || 0}
								</span>
							</div>
							{question.visual_analysis.geometric_accuracy && (
								<>
									<div>
										<span className="font-medium">Scale Factor:</span>
										<span className="ml-2 font-mono">
											{question.visual_analysis.geometric_accuracy.scale_factor?.toFixed(
												2
											) || 'N/A'}
										</span>
									</div>
									<div>
										<span className="font-medium">Rotation:</span>
										<span className="ml-2 font-mono">
											{question.visual_analysis.geometric_accuracy.rotation_angle?.toFixed(
												1
											) || 'N/A'}
											°
										</span>
									</div>
									<div>
										<span className="font-medium">Position Error:</span>
										<span className="ml-2 font-mono">
											{question.visual_analysis.geometric_accuracy.position_error?.toFixed(
												2
											) || 'N/A'}
										</span>
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{/* Override Form */}
				{showOverrideForm && (
					<div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
						<h4 className="font-medium text-sm mb-3">Override AI Marking</h4>
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium mb-1">
									Marks Awarded
								</label>
								<input
									type="number"
									min="0"
									max={question.total_marks}
									value={overrideMarks}
									onChange={(e) => setOverrideMarks(parseInt(e.target.value))}
									className="w-20 px-2 py-1 border rounded text-sm"
								/>
								<span className="text-sm text-gray-600 ml-2">
									/ {question.total_marks}
								</span>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">
									Feedback
								</label>
								<textarea
									value={overrideFeedback}
									onChange={(e) => setOverrideFeedback(e.target.value)}
									className="w-full px-2 py-1 border rounded text-sm"
									rows={3}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">
									Reason for Override
								</label>
								<input
									type="text"
									value={overrideReason}
									onChange={(e) => setOverrideReason(e.target.value)}
									placeholder="e.g., AI missed key points, student deserves partial credit"
									className="w-full px-2 py-1 border rounded text-sm"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={handleOverride}
									className="bg-yellow-600 hover:bg-yellow-700"
									size="sm"
								>
									Apply Override
								</Button>
								<Button
									variant="outline"
									onClick={() => setShowOverrideForm(false)}
									size="sm"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-2 pt-2">
					{!showOverrideForm && (
						<Button
							variant="outline"
							onClick={() => setShowOverrideForm(true)}
							size="sm"
						>
							Override AI Mark
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
