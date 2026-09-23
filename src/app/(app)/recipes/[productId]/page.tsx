import { RecipeForm } from "../RecipeForm";
import { getRecipeEditorData } from "../editor-data";

export default async function RecipeEditPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const data = await getRecipeEditorData(productId);
  return <RecipeForm {...data} />;
}
