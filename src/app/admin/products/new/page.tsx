import { redirect } from "next/navigation";

export default function NewProductPage() {
  redirect("/admin/inventory?create=retail");
}
