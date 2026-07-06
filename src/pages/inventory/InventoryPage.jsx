import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  Download,
  Eye,
  IndianRupee,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  Pencil,
  Search,
  SearchX,
  Sparkles,
  Tags,
  Trash2,
  TriangleAlert,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import {
  inventoryCategories,
  inventoryProducts,
} from '../../data/mockData.js';
import {
  calculateProductValue,
  formatCurrency,
  formatDate,
  getStockBadgeVariant,
  getStockStatus,
} from '../../utils/formatters.js';

const stockFilters = ['All Stock', 'In Stock', 'Low Stock', 'Out of Stock'];
const sortOptions = ['Latest', 'Product Name', 'Stock Low to High', 'Highest Value'];

const emptyProductForm = {
  productName: '',
  category: '',
  barcode: '',
  supplier: '',
  purchasePrice: '',
  sellingPrice: '',
  gstPercentage: '',
  currentStock: '',
  minimumStock: '',
};

function productInitials(productName) {
  return productName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SelectControl({ label, name, value, onChange, children }) {
  return (
    <label className="block" htmlFor={name}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        id={name}
        name={name}
        onChange={onChange}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function InventoryFilters({ filters, onChange, onClear }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
        <Input
          icon={Search}
          label="Search"
          name="search"
          onChange={onChange}
          placeholder="Search products, barcode, supplier..."
          value={filters.search}
        />
        <SelectControl
          label="Category"
          name="category"
          onChange={onChange}
          value={filters.category}
        >
          <option>All Categories</option>
          {inventoryCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </SelectControl>
        <SelectControl
          label="Stock status"
          name="stockStatus"
          onChange={onChange}
          value={filters.stockStatus}
        >
          {stockFilters.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </SelectControl>
        <SelectControl
          label="Sort by"
          name="sortBy"
          onChange={onChange}
          value={filters.sortBy}
        >
          {sortOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </SelectControl>
        <Button className="w-full lg:w-auto" onClick={onClear} variant="secondary">
          Clear
        </Button>
      </div>
    </Card>
  );
}

function ProductAvatar({ product }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-600 ring-1 ring-indigo-100">
      {product.productImage || productInitials(product.productName)}
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, tone = 'slate' }) {
  return (
    <button
      aria-label={label}
      className={clsx(
        'grid h-9 w-9 place-items-center rounded-full border bg-white shadow-sm transition',
        tone === 'danger'
          ? 'border-rose-100 text-rose-500 hover:bg-rose-50'
          : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950',
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ProductTable({ products, onDelete, onEdit, onView }) {
  return (
    <Card className="hidden overflow-hidden xl:block" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Supplier</th>
              <th className="px-5 py-4">Purchase Price</th>
              <th className="px-5 py-4">Selling Price</th>
              <th className="px-5 py-4">GST</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Minimum</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const status = getStockStatus(product);
              return (
                <tr className="border-t border-slate-100" key={product.id}>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ProductAvatar product={product} />
                      <div>
                        <p className="font-black text-slate-950">
                          {product.productName}
                        </p>
                        <p className="text-sm text-slate-500">{product.barcode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
                    {product.category}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {product.supplier}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-bold text-slate-950">
                    {formatCurrency(product.purchasePrice)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-bold text-slate-950">
                    {formatCurrency(product.sellingPrice)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {product.gstPercentage}%
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                    {product.currentStock}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {product.minimumStock}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <Badge variant={getStockBadgeVariant(status)}>{status}</Badge>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton icon={Eye} label="View product" onClick={() => onView(product)} />
                      <ActionButton icon={Pencil} label="Edit product" onClick={() => onEdit(product)} />
                      <ActionButton
                        icon={Trash2}
                        label="Delete product"
                        onClick={() => onDelete(product)}
                        tone="danger"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProductCard({ product, onDelete, onEdit, onView }) {
  const status = getStockStatus(product);

  return (
    <Card className="xl:hidden" hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProductAvatar product={product} />
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{product.productName}</p>
            <p className="text-sm text-slate-500">{product.category}</p>
          </div>
        </div>
        <Badge variant={getStockBadgeVariant(status)}>{status}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Supplier
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950">{product.supplier}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Stock
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {product.currentStock} / {product.minimumStock}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Selling Price
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {formatCurrency(product.sellingPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            GST
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {product.gstPercentage}%
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button className="flex-1" onClick={() => onView(product)} size="sm" variant="secondary">
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button className="flex-1" onClick={() => onEdit(product)} size="sm" variant="secondary">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button className="flex-1" onClick={() => onDelete(product)} size="sm" variant="danger">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

function ModalShell({ children, onClose, size = 'max-w-2xl' }) {
  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-3 backdrop-blur-sm sm:place-items-center sm:p-6"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <button
          aria-label="Close modal backdrop"
          className="absolute inset-0"
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`relative max-h-[92vh] w-full ${size} overflow-y-auto rounded-3xl bg-white shadow-glass`}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProductModal({ mode, onClose, onSave, product }) {
  const [values, setValues] = useState(() => {
    if (!product) {
      return emptyProductForm;
    }

    return {
      productName: product.productName,
      category: product.category,
      barcode: product.barcode,
      supplier: product.supplier,
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      gstPercentage: String(product.gstPercentage),
      currentStock: String(product.currentStock),
      minimumStock: String(product.minimumStock),
    };
  });
  const [errors, setErrors] = useState({});

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validate() {
    const nextErrors = {};
    const requiredFields = [
      ['productName', 'Product name is required.'],
      ['category', 'Category is required.'],
      ['supplier', 'Supplier is required.'],
      ['purchasePrice', 'Purchase price is required.'],
      ['sellingPrice', 'Selling price is required.'],
      ['currentStock', 'Current stock is required.'],
      ['minimumStock', 'Minimum stock is required.'],
    ];

    requiredFields.forEach(([field, message]) => {
      if (!String(values[field]).trim()) {
        nextErrors[field] = message;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: product?.id ?? Date.now(),
      productName: values.productName.trim(),
      category: values.category,
      supplier: values.supplier.trim(),
      barcode: values.barcode.trim() || `890${Date.now().toString().slice(-7)}`,
      purchasePrice: Number(values.purchasePrice),
      sellingPrice: Number(values.sellingPrice),
      gstPercentage: Number(values.gstPercentage || 0),
      currentStock: Number(values.currentStock),
      minimumStock: Number(values.minimumStock),
      productImage: product?.productImage || productInitials(values.productName),
      createdAt: product?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <form className="p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">
              {mode === 'edit' ? 'Update inventory item' : 'New inventory item'}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {mode === 'edit' ? 'Edit Product' : 'Add Product'}
            </h2>
          </div>
          <button
            aria-label="Close product form"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-sm font-black text-indigo-600 shadow-sm">
              {values.productName ? productInitials(values.productName) : <Upload className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">Product image</p>
              <p className="mt-1 text-sm text-slate-500">
                Upload UI placeholder only. Images are not stored yet.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            error={errors.productName}
            label="Product name"
            name="productName"
            onChange={updateField}
            placeholder="Rice"
            value={values.productName}
          />
          <SelectControl
            label="Category"
            name="category"
            onChange={updateField}
            value={values.category}
          >
            <option value="">Select category</option>
            {inventoryCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </SelectControl>
          {errors.category ? (
            <p className="-mt-3 text-sm text-rose-600 sm:col-start-2">
              {errors.category}
            </p>
          ) : null}
          <Input
            label="Barcode"
            name="barcode"
            onChange={updateField}
            placeholder="8901001001"
            value={values.barcode}
          />
          <Input
            error={errors.supplier}
            label="Supplier"
            name="supplier"
            onChange={updateField}
            placeholder="ABC Traders"
            value={values.supplier}
          />
          <Input
            error={errors.purchasePrice}
            label="Purchase price"
            name="purchasePrice"
            onChange={updateField}
            placeholder="600"
            type="number"
            value={values.purchasePrice}
          />
          <Input
            error={errors.sellingPrice}
            label="Selling price"
            name="sellingPrice"
            onChange={updateField}
            placeholder="720"
            type="number"
            value={values.sellingPrice}
          />
          <Input
            label="GST percentage"
            name="gstPercentage"
            onChange={updateField}
            placeholder="18"
            type="number"
            value={values.gstPercentage}
          />
          <Input
            error={errors.currentStock}
            label="Current stock"
            name="currentStock"
            onChange={updateField}
            placeholder="7"
            type="number"
            value={values.currentStock}
          />
          <Input
            error={errors.minimumStock}
            label="Minimum stock"
            name="minimumStock"
            onChange={updateField}
            placeholder="10"
            type="number"
            value={values.minimumStock}
          />
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" type="button" variant="secondary">
            Cancel
          </Button>
          <Button rounded="2xl" type="submit">
            {mode === 'edit' ? 'Save Changes' : 'Save Product'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function ProductDetailsModal({ onClose, product }) {
  const status = getStockStatus(product);
  const details = [
    ['Category', product.category],
    ['Supplier', product.supplier],
    ['Barcode', product.barcode],
    ['Purchase price', formatCurrency(product.purchasePrice)],
    ['Selling price', formatCurrency(product.sellingPrice)],
    ['GST', `${product.gstPercentage}%`],
    ['Current stock', product.currentStock],
    ['Minimum stock', product.minimumStock],
    ['Estimated stock value', formatCurrency(calculateProductValue(product))],
    ['Last updated', formatDate(product.updatedAt)],
  ];

  return (
    <ModalShell onClose={onClose} size="max-w-xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <ProductAvatar product={product} />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {product.productName}
              </h2>
              <Badge className="mt-2" variant={getStockBadgeVariant(status)}>
                {status}
              </Badge>
            </div>
          </div>
          <button
            aria-label="Close product details"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm, product }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Delete this product from inventory?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {product.productName} will be removed from this local UI list. No backend
          data is touched.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl" variant="danger">
            Delete Product
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function EmptyState({ onClear }) {
  return (
    <Card className="text-center" padding="lg">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
        <SearchX className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">No products found</h2>
      <p className="mt-2 text-sm text-slate-500">
        Try changing your search or filters.
      </p>
      <Button className="mt-6" onClick={onClear} variant="secondary">
        Clear filters
      </Button>
    </Card>
  );
}

export default function InventoryPage() {
  const [products, setProducts] = useState(inventoryProducts);
  const [filters, setFilters] = useState({
    search: '',
    category: 'All Categories',
    stockStatus: 'All Stock',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, product: null });

  const filteredProducts = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextProducts = products.filter((product) => {
      const status = getStockStatus(product);
      const matchesSearch =
        !searchTerm ||
        product.productName.toLowerCase().includes(searchTerm) ||
        product.barcode.toLowerCase().includes(searchTerm) ||
        product.supplier.toLowerCase().includes(searchTerm);
      const matchesCategory =
        filters.category === 'All Categories' || product.category === filters.category;
      const matchesStock =
        filters.stockStatus === 'All Stock' ||
        status === filters.stockStatus ||
        (filters.stockStatus === 'Low Stock' && status === 'Critical');

      return matchesSearch && matchesCategory && matchesStock;
    });

    return [...nextProducts].sort((a, b) => {
      if (filters.sortBy === 'Product Name') {
        return a.productName.localeCompare(b.productName);
      }

      if (filters.sortBy === 'Stock Low to High') {
        return a.currentStock - b.currentStock;
      }

      if (filters.sortBy === 'Highest Value') {
        return calculateProductValue(b) - calculateProductValue(a);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filters, products]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      category: 'All Categories',
      stockStatus: 'All Stock',
      sortBy: 'Latest',
    });
  }

  function saveProduct(product) {
    setProducts((current) => {
      const exists = current.some((item) => item.id === product.id);

      if (exists) {
        return current.map((item) => (item.id === product.id ? product : item));
      }

      return [product, ...current];
    });
    setModalState({ type: null, product: null });
  }

  function confirmDelete() {
    setProducts((current) =>
      current.filter((product) => product.id !== modalState.product.id),
    );
    setModalState({ type: null, product: null });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setModalState({ type: 'add', product: null })}>
              <PackagePlus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
        subtitle="Manage products, stock levels, GST, pricing, and suppliers."
        title="Inventory"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          status="info"
          title="Total Products"
          trend="Across all store categories"
          value="231"
        />
        <StatCard
          icon={TriangleAlert}
          status="warning"
          title="Low Stock"
          trend="Needs reorder planning"
          value="7"
        />
        <StatCard
          icon={IndianRupee}
          status="success"
          title="Inventory Value"
          trend="Estimated current value"
          value="₹8,42,000"
        />
        <StatCard
          icon={Tags}
          status="neutral"
          title="Categories"
          trend="Active product groups"
          value="12"
        />
      </section>

      <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
            <WandSparkles className="h-6 w-6" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
              AI Insight
            </Badge>
            <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
              Rice and Sugar are below minimum stock. Reorder before Friday to
              avoid weekend shortages.
            </p>
          </div>
          <Button variant="secondary">
            <Sparkles className="h-4 w-4" />
            View reorder plan
          </Button>
        </div>
      </Card>

      <InventoryFilters
        filters={filters}
        onChange={updateFilter}
        onClear={clearFilters}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Product Stock</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredProducts.length} of {products.length} local demo products.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <PackageCheck className="h-4 w-4 text-emerald-500" />
            Local state only
          </div>
        </div>
      </Card>

      {filteredProducts.length ? (
        <>
          <ProductTable
            onDelete={(product) => setModalState({ type: 'delete', product })}
            onEdit={(product) => setModalState({ type: 'edit', product })}
            onView={(product) => setModalState({ type: 'view', product })}
            products={filteredProducts}
          />
          <div className="grid gap-4 xl:hidden">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                onDelete={(selectedProduct) =>
                  setModalState({ type: 'delete', product: selectedProduct })
                }
                onEdit={(selectedProduct) =>
                  setModalState({ type: 'edit', product: selectedProduct })
                }
                onView={(selectedProduct) =>
                  setModalState({ type: 'view', product: selectedProduct })
                }
                product={product}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      <Card className="xl:hidden">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <PackageOpen className="h-5 w-5 text-indigo-500" />
          Product cards replace the desktop table on mobile for easier scanning.
        </div>
      </Card>

      {modalState.type === 'add' || modalState.type === 'edit' ? (
        <ProductModal
          mode={modalState.type}
          onClose={() => setModalState({ type: null, product: null })}
          onSave={saveProduct}
          product={modalState.product}
        />
      ) : null}

      {modalState.type === 'view' && modalState.product ? (
        <ProductDetailsModal
          onClose={() => setModalState({ type: null, product: null })}
          product={modalState.product}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.product ? (
        <DeleteConfirmModal
          onCancel={() => setModalState({ type: null, product: null })}
          onConfirm={confirmDelete}
          product={modalState.product}
        />
      ) : null}
    </div>
  );
}
