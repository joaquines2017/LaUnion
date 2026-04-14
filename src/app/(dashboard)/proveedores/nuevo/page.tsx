import { FormProveedor } from "@/components/proveedores/FormProveedor";

export default function NuevoProveedorPage() {
  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo proveedor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Completá los datos del proveedor</p>
      </div>
      <FormProveedor />
    </div>
  );
}
