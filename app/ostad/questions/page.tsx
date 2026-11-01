import css from "../ostad.module.css";
import QuestionsView from "../_components/QuestionsView";
import questions from "../data/questions.json";
import type { Question } from "../_lib/types";

export default function QuestionsPage() {
  return (
    <>
      <h1 className={css.subject}>What people ask</h1>
      <p className={css.lede}>
        Questions viewers typed under the top niche TikToks (Reddit blocked this account&apos;s scrapers, so comments under the winning videos stand in). Likes are
        comment likes. &ldquo;Good video?&rdquo; says whether the corpus already has a winning video that answers it; &ldquo;no&rdquo; is an open lane.
      </p>
      <QuestionsView rows={questions as Question[]} />
    </>
  );
}
