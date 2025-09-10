'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { markResultSchema } from '@/lib/schemas';
import { Link } from '@/components/ui/link';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useState } from 'react';

function sanitizeForFilename(input: string): string {
	const normalized = input.normalize('NFKD');
	const replaced = normalized.replace(/[^\w\s.-]/g, '_');
	const collapsed = replaced.trim().replace(/\s+/g, '_');
	return (collapsed || 'result').slice(0, 60);
}

function formatTimestampForFilename(d: Date = new Date()): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
		d.getHours()
	)}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function downloadBlob(data: BlobPart, mimeType: string, filename: string) {
	const blob = new Blob([data], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	setTimeout(() => {
		a.remove();
		URL.revokeObjectURL(url);
	}, 0);
}

function toCsv(result: z.infer<typeof markResultSchema>): string {
	const header = [
		'Student Name',
		'Question Number',
		'Marks Awarded',
		'Total Marks',
		'Confidence',
		'Feedback',
		'Overall Confidence',
		'Total Marks Awarded',
		'Total Marks Available',
		'General Feedback',
	];

	const rows = result.results.map((q) => [
		result.student_name ?? '',
		q.question_number,
		q.marks_awarded,
		q.total_marks,
		typeof q.confidence === 'number'
			? `${(q.confidence * 100).toFixed(0)}%`
			: '',
		q.feedback ?? '',
		typeof result.overall_confidence === 'number'
			? `${(result.overall_confidence * 100).toFixed(0)}%`
			: '',
		result.total_marks_awarded,
		result.total_marks_available,
		result.general_feedback ?? '',
	]);

	const escapeCell = (value: unknown) => {
		const s = String(value ?? '');
		if (/[",\n]/.test(s)) {
			return '"' + s.replace(/"/g, '""') + '"';
		}
		return s;
	};

	return [header, ...rows]
		.map((row) => row.map(escapeCell).join(','))
		.join('\n');
}

interface MarkResultQuestion {
	question_number: number;
	marks_awarded: number;
	total_marks: number;
	feedback: string;
	reason: string;
	confidence: number;
	question_type?: string;
	expected_visual_answer?: {
		shape_type: string;
		vertices?: number[][];
		tolerance?: {
			scale?: number;
			rotation?: number;
			position?: number;
		};
	};
	visual_analysis?: any;
	source_references?: any;
	debug?: {
		student_answer?: string;
		mark_scheme?: any;
		confidence_breakdown?: any;
		llm_feedback?: string;
		visual_analysis?: any;
	};
}

interface MarkResultProps {
	result: {
		student_name: string;
		results: MarkResultQuestion[];
		total_marks_awarded: number;
		total_marks_available: number;
		general_feedback: string;
		overall_confidence?: number;
	};
	clearPDFs: () => void;
	schemePdfUrl?: string;
	studentPdfUrl?: string;
	onUpdateResult?: (updatedResult: any) => void;
}

function buildPdfPageUrl(baseUrl: string | undefined, page?: number) {
	if (!baseUrl || !page || page <= 0) return undefined;
	return `${baseUrl}#page=${page}`;
}

export default function MarkResult({
	result,
	clearPDFs,
	schemePdfUrl,
	studentPdfUrl,
	onUpdateResult,
}: MarkResultProps) {
	const [editableResult, setEditableResult] = useState(result);
	const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
	const [editingMarks, setEditingMarks] = useState<number>(0);
	const [editingFeedback, setEditingFeedback] = useState<string>('');

	const percentage = Math.round(
		(editableResult.total_marks_awarded /
			editableResult.total_marks_available) *
			100
	);

	const startEditing = (questionNumber: number) => {
		const question = editableResult.results.find(
			(q) => q.question_number === questionNumber
		);
		if (question) {
			setEditingQuestion(questionNumber);
			setEditingMarks(question.marks_awarded);
			setEditingFeedback(question.feedback);
		}
	};

	const saveEdit = () => {
		if (editingQuestion === null) return;

		const updatedResult = {
			...editableResult,
			results: editableResult.results.map((q) =>
				q.question_number === editingQuestion
					? { ...q, marks_awarded: editingMarks, feedback: editingFeedback }
					: q
			),
		};

		// Recalculate total marks
		updatedResult.total_marks_awarded = updatedResult.results.reduce(
			(sum, q) => sum + q.marks_awarded,
			0
		);

		setEditableResult(updatedResult);
		setEditingQuestion(null);

		// Notify parent component if callback provided
		if (onUpdateResult) {
			onUpdateResult(updatedResult);
		}
	};

	const cancelEdit = () => {
		setEditingQuestion(null);
		setEditingMarks(0);
		setEditingFeedback('');
	};

	const baseFilename = `marking_results_${sanitizeForFilename(
		editableResult.student_name ?? 'student'
	)}_${formatTimestampForFilename()}`;

	const handleExportJSON = () => {
		const json = JSON.stringify(editableResult, null, 2);
		downloadBlob(
			json,
			'application/json;charset=utf-8',
			`${baseFilename}.json`
		);
	};

	const handleExportCSV = () => {
		const csv = '\uFEFF' + toCsv(editableResult);
		downloadBlob(csv, 'text/csv;charset=utf-8', `${baseFilename}.csv`);
	};

	return (
		<div className="min-h-[100dvh] w-full flex justify-center p-4">
			<Card className="w-full max-w-4xl">
				<CardHeader className="text-center space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Button variant="outline" onClick={clearPDFs}>
								Mark Another Paper
							</Button>
							{/* <Button
								variant="outline"
								onClick={handleExportJSON}
								aria-label="Export results as JSON"
							>
								Export JSON
							</Button> */}
							<Button
								variant="outline"
								onClick={handleExportCSV}
								aria-label="Export results as CSV"
							>
								Export CSV
							</Button>
						</div>
						<div className="text-right">
							{editableResult.student_name && (
								<p className="text-sm text-muted-foreground">
									Student: {editableResult.student_name ?? 'Unknown'}
								</p>
							)}
						</div>
					</div>
					<div className="space-y-2">
						<CardTitle className="text-3xl font-bold">
							Marking Results
						</CardTitle>
						<div className="flex items-center justify-center space-x-4">
							<Badge variant="secondary" className="text-lg px-4 py-2">
								{editableResult.total_marks_awarded} /{' '}
								{editableResult.total_marks_available}
							</Badge>
							<Badge
								variant={
									percentage >= 70
										? 'default'
										: percentage >= 50
										? 'secondary'
										: 'destructive'
								}
								className="text-lg px-4 py-2"
							>
								{percentage}%
							</Badge>
							{typeof editableResult.overall_confidence === 'number' && (
								<Badge variant="outline" className="text-lg px-4 py-2">
									Overall Confidence:{' '}
									{(editableResult.overall_confidence * 100).toFixed(0)}%
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						<h3 className="text-xl font-semibold">Question Results</h3>
						{editableResult.results.map((question, index) => (
							<Card key={index} className="p-4">
								<div className="flex items-start justify-between mb-2">
									<h4 className="font-medium">
										Question {question.question_number}
									</h4>
									<div className="flex items-center space-x-2">
										{editingQuestion === question.question_number ? (
											<div className="flex items-center space-x-2">
												<Input
													type="number"
													min="0"
													max={question.total_marks}
													value={editingMarks}
													onChange={(e) =>
														setEditingMarks(parseInt(e.target.value) || 0)
													}
													className="w-16 h-8 text-sm"
												/>
												<span className="text-sm">
													/ {question.total_marks}
												</span>
											</div>
										) : (
											<Badge variant="outline">
												{question.marks_awarded} / {question.total_marks}
											</Badge>
										)}
										<Badge variant="secondary" className="text-xs">
											Confidence: {(question.confidence * 100).toFixed(0)}%
										</Badge>
									</div>
								</div>
								{editingQuestion === question.question_number ? (
									<div className="space-y-3">
										<textarea
											value={editingFeedback}
											onChange={(e) => setEditingFeedback(e.target.value)}
											className="w-full p-2 border rounded text-sm"
											rows={3}
										/>
										<div className="flex gap-2">
											<Button
												onClick={saveEdit}
												size="sm"
												className="bg-green-600 hover:bg-green-700"
											>
												Save
											</Button>
											<Button onClick={cancelEdit} variant="outline" size="sm">
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											{question.feedback}
										</p>
										{question.reason && (
											<p className="text-xs text-muted-foreground mb-2">
												<span className="font-semibold">Reason:</span>{' '}
												{question.reason}
											</p>
										)}
										<Button
											onClick={() => startEditing(question.question_number)}
											variant="outline"
											size="sm"
										>
											Edit
										</Button>
									</div>
								)}
								{(question as any).source_references && (
									<div className="mt-3 text-xs text-muted-foreground flex gap-4">
										{buildPdfPageUrl(
											studentPdfUrl,
											(question as any).source_references?.student_page
										) && (
											<Link
												href={
													buildPdfPageUrl(
														studentPdfUrl,
														(question as any).source_references?.student_page
													) as string
												}
											>
												View answer (p
												{(question as any).source_references?.student_page})
											</Link>
										)}
										{buildPdfPageUrl(
											schemePdfUrl,
											(question as any).source_references?.scheme_page
										) && (
											<Link
												href={
													buildPdfPageUrl(
														schemePdfUrl,
														(question as any).source_references?.scheme_page
													) as string
												}
											>
												View mark scheme (p
												{(question as any).source_references?.scheme_page})
											</Link>
										)}
									</div>
								)}
							</Card>
						))}
					</div>

					{editableResult.general_feedback && (
						<Card className="p-4 bg-muted/50">
							<h3 className="font-semibold mb-2">General Feedback</h3>
							<p className="text-sm">{editableResult.general_feedback}</p>
						</Card>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
