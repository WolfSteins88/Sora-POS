import { RecipeForm } from "../RecipeForm";
import { getRecipeEditorData } from "../editor-data";

export default async function NewRecipePage() {
  const data = await getRecipeEditorData(null);
  return <RecipeForm {...data} />;
}
