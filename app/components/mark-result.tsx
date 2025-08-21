import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { markResultSchema } from '@/lib/schemas';
import { z } from 'zod';

interface MarkResultProps {
	result: z.infer<typeof markResultSchema>;
	clearPDFs: () => void;
}

export default function MarkResult({ result, clearPDFs }: MarkResultProps) {
	const percentage = Math.round(
		(result.total_marks_awarded / result.total_marks_available) * 100
	);

	return (
		<div className="min-h-[100dvh] w-full flex justify-center p-4">
			<Card className="w-full max-w-4xl">
				<CardHeader className="text-center space-y-4">
					<div className="flex items-center justify-between">
						<Button variant="outline" onClick={clearPDFs}>
							Mark Another Paper
						</Button>
						<div className="text-right">
							{result.student_name && (
								<p className="text-sm text-muted-foreground">
									Student: {result.student_name}
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
