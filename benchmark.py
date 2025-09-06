import json
import sys

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
    correct_map = {q['question_number']: q['marks_awarded'] for q in correct_results['results']}
    for q in app_results['results']:
        q_num = q['question_number']
        app_mark = q['marks_awarded']
        correct_mark = correct_map.get(q_num)
        if correct_mark is not None:
            percent = score_question(app_mark, correct_mark)
            scores.append((q_num, percent))
    overall = sum([s[1] for s in scores]) / len(scores) if scores else 0
    return overall, scores

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python benchmark.py <app_result.json> <correct_result.json>")
        sys.exit(1)
    app_results = load_results(sys.argv[1])
    correct_results = load_results(sys.argv[2])
    overall, per_question = benchmark(app_results, correct_results)
    print(f"Overall Score: {overall:.2f}%")
    print("Per Question Scores:")
    for q_num, score in per_question:
        print(f"  Q{q_num}: {score}%")
