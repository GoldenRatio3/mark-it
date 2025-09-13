'use client';

import { useState, useEffect } from 'react';
import { markResultSchema } from '@/lib/schemas';
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
import MarkResult from '@/components/mark-result';
import { AnimatePresence, motion } from 'framer-motion';

export default function ChatWithFiles() {
	const [files, setFiles] = useState<File[]>([]);
	const [files2, setFiles2] = useState<File[]>([]);
	const [schemePdfUrl, setSchemePdfUrl] = useState<string | null>(null);
	const [studentPdfUrl, setStudentPdfUrl] = useState<string | null>(null);
	const [markResult, setMarkResult] = useState<z.infer<
		typeof markResultSchema
	> | null>(null);

	const [isDragging, setIsDragging] = useState(false);
	const [isDragging2, setIsDragging2] = useState(false);

	const [isLoading, setIsLoading] = useState(false);

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

	// Create/revoke object URLs for quick linking to specific pages
	useEffect(() => {
		if (files.length > 0) {
			const url = URL.createObjectURL(files[0]);
			setSchemePdfUrl(url);
			return () => URL.revokeObjectURL(url);
		} else {
			setSchemePdfUrl(null);
		}
	}, [files]);

	useEffect(() => {
		if (files2.length > 0) {
			const url = URL.createObjectURL(files2[0]);
			setStudentPdfUrl(url);
			return () => URL.revokeObjectURL(url);
		} else {
			setStudentPdfUrl(null);
		}
	}, [files2]);

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
		setIsLoading(true);

		try {
			const allFiles = [...files, ...files2];
			const encodedFiles = await Promise.all(
				allFiles.map(async (file) => ({
					name: file.name,
					type: file.type,
					data: await encodeFileAsBase64(file),
				}))
			);

			const response = await fetch('/api/mark', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ files: encodedFiles }),
			});

			let errorMsg = '';
			if (!response.ok) {
				try {
					const errorData = await response.json();
					errorMsg = errorData?.error || 'Failed to mark paper.';
				} catch {
					errorMsg = 'Failed to mark paper.';
				}
				throw new Error(errorMsg);
			}

			const result = await response.json();
			setMarkResult(result);
		} catch (error: any) {
			toast.error(error?.message || 'Failed to mark paper. Please try again.');
			// Do not clear files here; allow user to retry with same files
		} finally {
			setIsLoading(false);
		}
	};

	const clearPDFs = () => {
		setFiles([]);
		setFiles2([]);
		setMarkResult(null);
		if (schemePdfUrl) URL.revokeObjectURL(schemePdfUrl);
		if (studentPdfUrl) URL.revokeObjectURL(studentPdfUrl);
		setSchemePdfUrl(null);
		setStudentPdfUrl(null);
	};

	const progress = isLoading ? 50 : 0;

	// Show results directly when available
	if (markResult && markResult.results.length > 0) {
		return (
			<MarkResult
				result={markResult}
				clearPDFs={clearPDFs}
				schemePdfUrl={schemePdfUrl || undefined}
				studentPdfUrl={studentPdfUrl || undefined}
				onUpdateResult={setMarkResult}
			/>
		);
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
							Upload the mark scheme and student paper to get started
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
										<span>
											Drop the student's paper here or click to browse.
										</span>
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
							disabled={files.length === 0 || files2.length === 0 || isLoading}
						>
							{isLoading ? (
								<span className="flex items-center space-x-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Marking...</span>
								</span>
							) : (
								'Mark Paper'
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
									Analysing PDF content...
								</span>
							</div>
						</div>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
