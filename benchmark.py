import json
import sys
import os
import re
import requests

def load_results(path):
    with open(path, 'r') as f:
        return json.load(f)

def score_question(app_mark, correct_mark):
    if app_mark == correct_mark:
        return 100
    elif abs(app_mark - correct_mark) == 1:
        return 50
    else:
        return 0

def benchmark(app_results, correct_results):
    scores = []
    correct_map = {str(q['question_number']): q['marks_awarded'] for q in correct_results['results']}
    for q in app_results['results']:
        q_num = str(q['question_number'])
        app_mark = q['marks_awarded']
        correct_mark = correct_map.get(q_num)
        if correct_mark is not None:
            percent = score_question(app_mark, correct_mark)
            scores.append((q_num, percent))
    overall = sum([s[1] for s in scores]) / len(scores) if scores else 0
    return overall, scores

def find_pairs(folder):
    files = os.listdir(folder)
    app_files = [f for f in files if re.match(r'.*_app_result.json$', f)]
    pairs = []
    for app_file in app_files:
        prefix = app_file.replace('_app_result.json', '')
        correct_file = f'{prefix}_correct_result.json'
        if correct_file in files:
            pairs.append((app_file, correct_file))
    return pairs

def post_to_mark_endpoint(mark_scheme_pdf, student_paper_pdf, endpoint_url):
    def read_pdf(path):
        with open(path, 'rb') as f:
            return f.read()
    files = [
        {
            'data': read_pdf(mark_scheme_pdf),
            'type': 'application/pdf',
        },
        {
            'data': read_pdf(student_paper_pdf),
            'type': 'application/pdf',
        },
    ]
    # Encode binary data as base64 for JSON transport
    import base64
    for f in files:
        f['data'] = base64.b64encode(f['data']).decode('utf-8')
    payload = {'files': files}
    headers = {'Content-Type': 'application/json'}
    response = requests.post(endpoint_url, data=json.dumps(payload), headers=headers)
    return response.json(), response.status_code

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python benchmark.py <folder>")
        sys.exit(1)
    folder = sys.argv[1]
    # --- API Benchmark for all examples ---
    print("\n--- API Benchmark for all examples ---")
    # Find all example sets by looking for *_correct_result.json
    example_prefixes = [f.replace('_correct_result.json', '') for f in os.listdir(folder) if f.endswith('_correct_result.json')]
    endpoint_url = 'http://localhost:3000/api/mark'
    all_overall = []
    for prefix in example_prefixes:
        mark_scheme_pdf = os.path.join(folder, f"{prefix}_mark_scheme.pdf")
        student_paper_pdf = os.path.join(folder, f"{prefix}_student_paper.pdf")
        correct_result_file = os.path.join(folder, f"{prefix}_correct_result.json")
        print(f"\nExample: {prefix}")
        if os.path.exists(mark_scheme_pdf) and os.path.exists(student_paper_pdf):
            result, status = post_to_mark_endpoint(mark_scheme_pdf, student_paper_pdf, endpoint_url)
            print(f"API status: {status}")
            if os.path.exists(correct_result_file):
                correct_results = load_results(correct_result_file)
                overall, per_question = benchmark(result, correct_results)
                all_overall.append(overall)
                print(f"  Overall Score: {overall:.2f}%")
                print("  Per Question Scores:")
                for q_num, score in per_question:
                    print(f"    Q{q_num}: {score}%")
            else:
                print("  Correct result file not found for API benchmark.")
        else:
            print("  PDF files not found for API test.")
    if all_overall:
        print(f"\nAverage Overall Score across all examples: {sum(all_overall)/len(all_overall):.2f}%")
