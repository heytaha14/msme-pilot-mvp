function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function previousMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

function isInRange(value, start, end) {
  const parsed = toDate(value);
  if (!parsed) return false;
  return parsed >= start && parsed <= end;
}

function activeSales(sales = []) {
  return sales.filter((sale) => sale.paymentStatus !== 'Cancelled');
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value))));
}

export function normalizeScore(value) {
  return clampScore(value);
}

export function calculateLowStockProducts(products = []) {
  return products.filter((product) => {
    const stock = toNumber(product.stock ?? product.currentStock);
    const minStock = toNumber(product.minStock ?? product.minimumStock);
    return stock > 0 && stock <= minStock;
  });
}

export function calculateOutOfStockProducts(products = []) {
  return products.filter((product) => toNumber(product.stock ?? product.currentStock) <= 0);
}

export function calculateInventoryValue(products = []) {
  return products.reduce(
    (sum, product) =>
      sum + toNumber(product.stock ?? product.currentStock) * toNumber(product.purchasePrice),
    0,
  );
}

export function calculateMonthlyRevenue(sales = [], now = new Date()) {
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return activeSales(sales)
    .filter((sale) => isInRange(sale.saleDate, start, end))
    .reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
}

export function calculatePreviousMonthlyRevenue(sales = [], now = new Date()) {
  const { start, end } = previousMonthRange(now);
  return activeSales(sales)
    .filter((sale) => isInRange(sale.saleDate, start, end))
    .reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
}

export function calculateSalesGrowth(currentRevenue, previousRevenue) {
  const current = toNumber(currentRevenue);
  const previous = toNumber(previousRevenue);

  if (!previous && current > 0) return 50;
  if (!previous) return 0;

  return ((current - previous) / previous) * 100;
}

export function calculatePendingCustomerDues(customers = []) {
  return customers.reduce((sum, customer) => sum + toNumber(customer.pendingAmount), 0);
}

export function calculateSalesDueAmount(sales = []) {
  return activeSales(sales)
    .filter((sale) => ['Pending', 'Partial'].includes(sale.paymentStatus))
    .reduce((sum, sale) => sum + toNumber(sale.dueAmount), 0);
}

export function calculateSupplierDues(suppliers = []) {
  return suppliers.reduce((sum, supplier) => sum + toNumber(supplier.paymentDue), 0);
}

export function calculateProfitMargin(sales = []) {
  const revenue = activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const profit = activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.profit), 0);

  if (!revenue) {
    return { revenue: 0, profit, profitMarginPercentage: 0 };
  }

  return {
    revenue,
    profit,
    profitMarginPercentage: (profit / revenue) * 100,
  };
}

export function getHealthStatus(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
}

export function getComponentStatus(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Healthy';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Action';
  return 'Critical';
}

export function getScoreTrend(currentScore, previousScore) {
  if (previousScore === null || previousScore === undefined) {
    return {
      value: 0,
      label: 'No previous snapshot',
      direction: 'neutral',
    };
  }

  const change = toNumber(currentScore) - toNumber(previousScore);
  if (change > 0) {
    return {
      value: change,
      label: `+${change} points since last snapshot`,
      direction: 'up',
    };
  }

  if (change < 0) {
    return {
      value: change,
      label: `${change} points since last snapshot`,
      direction: 'down',
    };
  }

  return {
    value: 0,
    label: 'No score change since last snapshot',
    direction: 'neutral',
  };
}

export function calculateInventoryHealth(products = []) {
  const totalProducts = products.length;
  const lowStockProducts = calculateLowStockProducts(products);
  const outOfStockProducts = calculateOutOfStockProducts(products);
  const lowStockCount = lowStockProducts.length;
  const outOfStockCount = outOfStockProducts.length;
  const healthyStockCount = Math.max(0, totalProducts - lowStockCount - outOfStockCount);
  const inventoryValue = calculateInventoryValue(products);

  if (!totalProducts) {
    return {
      score: 0,
      status: 'Not Enough Data',
      insight: 'Add products to track inventory health.',
      totalProducts,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
      inventoryValue,
      lowStockProducts,
      outOfStockProducts,
    };
  }

  const outOfStockPenalty = outOfStockCount / totalProducts;
  const lowStockPenalty = lowStockCount / totalProducts;
  const score = clampScore(100 - outOfStockPenalty * 45 - lowStockPenalty * 25);
  const insight = lowStockCount || outOfStockCount
    ? `${lowStockCount} products are low stock and ${outOfStockCount} products are out of stock.`
    : 'Inventory is healthy. No urgent reorder needed.';

  return {
    score,
    status: getComponentStatus(score),
    insight,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    healthyStockCount,
    inventoryValue,
    lowStockProducts,
    outOfStockProducts,
  };
}

export function calculateSalesPerformance(sales = []) {
  const active = activeSales(sales);
  const now = new Date();
  const currentMonthRevenue = calculateMonthlyRevenue(active, now);
  const previousMonthRevenue = calculatePreviousMonthlyRevenue(active, now);
  const salesGrowthPercentage = calculateSalesGrowth(currentMonthRevenue, previousMonthRevenue);
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const today = now.toISOString().slice(0, 10);
  const currentMonthSales = active.filter((sale) => isInRange(sale.saleDate, start, end));
  const todaySales = active
    .filter((sale) => String(sale.saleDate || '').slice(0, 10) === today)
    .reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);

  if (!active.length) {
    return {
      score: 0,
      status: 'Not Enough Data',
      insight: 'No sales recorded yet. Add sales to measure performance.',
      currentMonthRevenue,
      previousMonthRevenue,
      currentMonthSalesCount: 0,
      todaySales,
      averageSaleValue: 0,
      salesGrowthPercentage: 0,
    };
  }

  let score = 60 + Math.max(-50, Math.min(50, salesGrowthPercentage)) * 0.6;
  if (currentMonthRevenue > 0 && currentMonthSales.length >= 5) score += 10;
  if (todaySales > 0) score += 5;
  score = clampScore(score);

  return {
    score,
    status: getComponentStatus(score),
    insight: currentMonthRevenue
      ? `Monthly revenue is ${currentMonthRevenue} with ${salesGrowthPercentage.toFixed(1)}% growth.`
      : 'No sales recorded this month.',
    currentMonthRevenue,
    previousMonthRevenue,
    currentMonthSalesCount: currentMonthSales.length,
    todaySales,
    averageSaleValue: currentMonthSales.length ? currentMonthRevenue / currentMonthSales.length : 0,
    salesGrowthPercentage,
  };
}

export function calculatePendingPaymentsScore(customers = [], sales = []) {
  const customerPendingAmount = calculatePendingCustomerDues(customers);
  const salesDueAmount = calculateSalesDueAmount(sales);
  const pendingAmount = customerPendingAmount || salesDueAmount;
  const monthlyRevenue = calculateMonthlyRevenue(sales);
  const overdueCustomers = customers.filter((customer) => customer.paymentStatus === 'Overdue').length;

  let score = customers.length || activeSales(sales).length ? 75 : 0;

  if (!customers.length && !activeSales(sales).length) {
    score = 0;
  } else if (pendingAmount <= 0) {
    score = 100;
  } else if (monthlyRevenue > 0) {
    const pendingRatio = pendingAmount / monthlyRevenue;
    if (pendingRatio <= 0.1) score = 90;
    else if (pendingRatio <= 0.25) score = 75;
    else if (pendingRatio <= 0.5) score = 55;
    else score = 35;
  } else {
    score = 45;
  }

  if (overdueCustomers > 0) {
    score -= 10;
  }

  score = clampScore(score);

  return {
    score,
    status: score ? getComponentStatus(score) : 'Not Enough Data',
    insight: pendingAmount > 0
      ? `${pendingAmount} is pending from customers.`
      : customers.length || activeSales(sales).length
        ? 'Customer dues are clear.'
        : 'Add customers or sales to measure payment recovery.',
    customerPendingAmount,
    salesDueAmount,
    pendingAmount,
    overdueCustomers,
  };
}

export function calculateCustomerGrowth(customers = []) {
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previous = previousMonthRange(now);
  const totalCustomers = customers.length;
  const newCustomersThisMonth = customers.filter((customer) =>
    isInRange(customer.createdAt || customer.$createdAt, currentStart, currentEnd),
  ).length;
  const newCustomersPreviousMonth = customers.filter((customer) =>
    isInRange(customer.createdAt || customer.$createdAt, previous.start, previous.end),
  ).length;

  if (!totalCustomers) {
    return {
      score: 0,
      status: 'Not Enough Data',
      insight: 'Add customers to track customer growth.',
      totalCustomers,
      newCustomersThisMonth,
      newCustomersPreviousMonth,
      growthChange: 0,
    };
  }

  let score = 45;
  if (newCustomersThisMonth >= 10) score = 90;
  else if (newCustomersThisMonth >= 3) score = 75;
  else if (newCustomersThisMonth >= 1) score = 60;

  if (totalCustomers >= 100) score += 10;
  else if (totalCustomers >= 50) score += 5;

  score = clampScore(score);

  return {
    score,
    status: getComponentStatus(score),
    insight: newCustomersThisMonth
      ? `${newCustomersThisMonth} new customers added this month.`
      : 'No new customers this month.',
    totalCustomers,
    newCustomersThisMonth,
    newCustomersPreviousMonth,
    growthChange: newCustomersThisMonth - newCustomersPreviousMonth,
  };
}

export function calculateProfitMarginScore(sales = []) {
  const active = activeSales(sales);
  const { revenue, profit, profitMarginPercentage } = calculateProfitMargin(active);

  if (!active.length || !revenue) {
    return {
      score: 0,
      status: 'Not Enough Data',
      insight: 'Profit data is unavailable until sales include profit.',
      totalRevenue: revenue,
      totalProfit: profit,
      profitMarginPercentage,
    };
  }

  let score = 25;
  if (profitMarginPercentage >= 30) score = 95;
  else if (profitMarginPercentage >= 20) score = 85;
  else if (profitMarginPercentage >= 15) score = 75;
  else if (profitMarginPercentage >= 10) score = 60;
  else if (profit > 0) score = 45;

  score = clampScore(score);

  return {
    score,
    status: getComponentStatus(score),
    insight: `Profit margin is ${profitMarginPercentage.toFixed(1)}%.`,
    totalRevenue: revenue,
    totalProfit: profit,
    profitMarginPercentage,
  };
}

export function calculateOverallBusinessHealth(componentScores) {
  return clampScore(
    componentScores.inventoryHealth * 0.25 +
      componentScores.salesPerformance * 0.25 +
      componentScores.pendingPaymentsScore * 0.2 +
      componentScores.customerGrowth * 0.15 +
      componentScores.profitMargin * 0.15,
  );
}
