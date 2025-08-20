'use client';

import { useState } from 'react';
import { experimental_useObject } from '@ai-sdk/react';
import { questionsSchema } from '@/lib/schemas';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileUp, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Quiz from '@/components/quiz';
import { AnimatePresence, motion } from 'framer-motion';

export default function ChatWithFiles() {
	const [files, setFiles] = useState<File[]>([]);
	const [files2, setFiles2] = useState<File[]>([]);
	const [questions, setQuestions] = useState<z.infer<typeof questionsSchema>>(
		[]
	);
	const [isDragging, setIsDragging] = useState(false);
	const [isDragging2, setIsDragging2] = useState(false);

	const {
		submit,
		object: partialQuestions,
		isLoading,
	} = experimental_useObject({
		api: '/api/generate-quiz',
		schema: questionsSchema,
		initialValue: undefined,
		onError: (error: unknown) => {
			toast.error('Failed to generate quiz. Please try again.');
			setFiles([]);
			setFiles2([]);
		},
		onFinish: ({
			object,
		}: {
			object: z.infer<typeof questionsSchema> | undefined;
		}) => {
			setQuestions(object ?? []);
		},
	});

	const handleFileChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		setFilesFunction: React.Dispatch<React.SetStateAction<File[]>>
	) => {
		const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

		if (isSafari && (isDragging || isDragging2)) {
			toast.error(
				'Safari does not support drag & drop. Please use the file picker.'
			);
			return;
		}

		const selectedFiles = Array.from(e.target.files || []);
		const validFiles = selectedFiles.filter(
			(file) => file.type === 'application/pdf' && file.size <= 5 * 1024 * 1024
		);
		console.log(validFiles);

		if (validFiles.length !== selectedFiles.length) {
			toast.error('Only PDF files under 5MB are allowed.');
		}

		setFilesFunction(validFiles);
	};

	const encodeFileAsBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = (error) => reject(error);
		});
	};

	const handleSubmitWithFiles = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const allFiles = [...files, ...files2];
		const encodedFiles = await Promise.all(
			allFiles.map(async (file) => ({
				name: file.name,
				type: file.type,
				data: await encodeFileAsBase64(file),
			}))
		);
		submit({ files: encodedFiles });
	};

	const clearPDF = () => {
		setFiles([]);
		setFiles2([]);
		setQuestions([]);
	};

	const progress = partialQuestions ? (partialQuestions.length / 4) * 100 : 0;

	// TODO: refactor component
	if (questions.length === 4) {
		return <Quiz title={'Paper'} questions={questions} clearPDF={clearPDF} />;
	}

	return (
		<div
			className="min-h-[100dvh] w-full flex justify-center"
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragExit={() => setIsDragging(false)}
			onDragEnd={() => setIsDragging(false)}
			onDragLeave={() => setIsDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setIsDragging(false);
				console.log(e.dataTransfer.files);
				handleFileChange(
					{
						target: { files: e.dataTransfer.files },
					} as React.ChangeEvent<HTMLInputElement>,
					setFiles
				);
			}}
		>
			<AnimatePresence>
				{isDragging && (
					<motion.div
						className="fixed pointer-events-none dark:bg-zinc-900/90 h-dvh w-dvw z-10 justify-center items-center flex flex-col gap-1 bg-zinc-100/90"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<div>Drag and drop files here</div>
						<div className="text-sm dark:text-zinc-400 text-zinc-500">
							{'(PDFs only)'}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
			<Card className="w-full max-w-md h-full border-0 sm:border sm:h-fit mt-12">
				<CardHeader className="text-center space-y-6">
					<div className="mx-auto flex items-center justify-center space-x-2 text-muted-foreground">
						<div className="rounded-full bg-primary/10 p-2">
							<FileUp className="h-6 w-6" />
						</div>
						<Plus className="h-4 w-4" />
						<div className="rounded-full bg-primary/10 p-2">
							<Loader2 className="h-6 w-6" />
						</div>
					</div>
					<div className="space-y-2">
						<CardTitle className="text-2xl font-bold">MarkIt</CardTitle>
						<CardDescription className="text-base">
							Upload the papers and let us do the rest
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmitWithFiles} className="space-y-4">
						<div className="space-y-4">
							<div
								className={`relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-muted-foreground/50`}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragging(true);
								}}
								onDragExit={() => setIsDragging(false)}
								onDragEnd={() => setIsDragging(false)}
								onDragLeave={() => setIsDragging(false)}
								onDrop={(e) => {
									e.preventDefault();
									setIsDragging(false);
									handleFileChange(
										{
											target: { files: e.dataTransfer.files },
										} as React.ChangeEvent<HTMLInputElement>,
										setFiles
									);
								}}
							>
								<input
									type="file"
									onChange={(e) => handleFileChange(e, setFiles)}
									accept="application/pdf"
									className="absolute inset-0 opacity-0 cursor-pointer"
								/>
								<FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
								<p className="text-sm text-muted-foreground text-center">
									{files.length > 0 ? (
										<span className="font-medium text-foreground">
											{files[0].name}
										</span>
									) : (
										<span>Drop the papers here or click to browse.</span>
									)}
								</p>
							</div>

							<div
								className={`relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-muted-foreground/50`}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragging2(true);
								}}
								onDragExit={() => setIsDragging2(false)}
								onDragEnd={() => setIsDragging2(false)}
								onDragLeave={() => setIsDragging2(false)}
								onDrop={(e) => {
									e.preventDefault();
									setIsDragging2(false);
									handleFileChange(
										{
											target: { files: e.dataTransfer.files },
										} as React.ChangeEvent<HTMLInputElement>,
										setFiles2
									);
								}}
							>
								<input
									type="file"
									onChange={(e) => handleFileChange(e, setFiles2)}
									accept="application/pdf"
									className="absolute inset-0 opacity-0 cursor-pointer"
								/>
								<FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
								<p className="text-sm text-muted-foreground text-center">
									{files2.length > 0 ? (
										<span className="font-medium text-foreground">
											{files2[0].name}
										</span>
									) : (
										<span>Drop the mark scheme here or click to browse.</span>
									)}
								</p>
							</div>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={files.length === 0 && files2.length === 0}
						>
							{isLoading ? (
								<span className="flex items-center space-x-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Marking...</span>
								</span>
							) : (
								'Mark It'
							)}
						</Button>
					</form>
				</CardContent>
				{isLoading && (
					<CardFooter className="flex flex-col space-y-4">
						<div className="w-full space-y-1">
							<div className="flex justify-between text-sm text-muted-foreground">
								<span>Progress</span>
								<span>{Math.round(progress)}%</span>
							</div>
							<Progress value={progress} className="h-2" />
						</div>
						<div className="w-full space-y-2">
							<div className="grid grid-cols-6 sm:grid-cols-4 items-center space-x-2 text-sm">
								<div
									className={`h-2 w-2 rounded-full ${
										isLoading ? 'bg-yellow-500/50 animate-pulse' : 'bg-muted'
									}`}
								/>
								<span className="text-muted-foreground text-center col-span-4 sm:col-span-2">
									{partialQuestions
										? `Marking question ${partialQuestions.length + 1}`
										: 'Analysing PDF content'}
								</span>
							</div>
						</div>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
