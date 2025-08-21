import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { markResultSchema } from '@/lib/schemas';
import { z } from 'zod';

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

interface MarkResultProps {
	result: z.infer<typeof markResultSchema>;
	clearPDFs: () => void;
}

export default function MarkResult({ result, clearPDFs }: MarkResultProps) {
	const percentage = Math.round(
		(result.total_marks_awarded / result.total_marks_available) * 100
	);

	const baseFilename = `marking_results_${sanitizeForFilename(
		result.student_name ?? 'student'
	)}_${formatTimestampForFilename()}`;

	const handleExportJSON = () => {
		const json = JSON.stringify(result, null, 2);
		downloadBlob(
			json,
			'application/json;charset=utf-8',
			`${baseFilename}.json`
		);
	};

	const handleExportCSV = () => {
		const csv = '\uFEFF' + toCsv(result);
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
							{result.student_name && (
								<p className="text-sm text-muted-foreground">
									Student: {result.student_name ?? 'Unknown'}
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
								{result.total_marks_awarded} / {result.total_marks_available}
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
							{typeof result.overall_confidence === 'number' && (
								<Badge variant="outline" className="text-lg px-4 py-2">
									Overall Confidence:{' '}
									{(result.overall_confidence * 100).toFixed(0)}%
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						<h3 className="text-xl font-semibold">Question Results</h3>
						{result.results.map((question, index) => (
							<Card key={index} className="p-4">
								<div className="flex items-start justify-between mb-2">
									<h4 className="font-medium">
										Question {question.question_number}
									</h4>
									<div className="flex items-center space-x-2">
										<Badge variant="outline">
											{question.marks_awarded} / {question.total_marks}
										</Badge>
										<Badge variant="secondary" className="text-xs">
											Confidence: {(question.confidence * 100).toFixed(0)}%
										</Badge>
									</div>
								</div>
								<p className="text-sm text-muted-foreground">
									{question.feedback}
								</p>
							</Card>
						))}
					</div>

					{result.general_feedback && (
						<Card className="p-4 bg-muted/50">
							<h3 className="font-semibold mb-2">General Feedback</h3>
							<p className="text-sm">{result.general_feedback}</p>
						</Card>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
