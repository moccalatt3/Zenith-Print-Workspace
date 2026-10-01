import {
  Package,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Box,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  Line,
} from "recharts";
import { useState, useEffect } from "react";
import adminDashboardService from "../../services/adminDashboardService";

const Dashboard = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("1"); // 1, 3, 6, 12 months
  const [showRevenueDetail, setShowRevenueDetail] = useState(false);
  const [revenueDetail, setRevenueDetail] = useState(null);

  // Filter options
  const periodOptions = [
    { value: "1", label: "1 Bulan" },
    { value: "3", label: "3 Bulan" },
    { value: "6", label: "6 Bulan" },
    { value: "12", label: "1 Tahun" },
  ];

  // Format currency Indonesia
  const formatCurrency = (amount) => {
    if (!amount) return "Rp 0";

    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}M`;
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}jt`;
    } else if (amount >= 1000) {
      return `Rp ${(amount / 1000).toFixed(1)}rb`;
    } else {
      return `Rp ${amount.toLocaleString("id-ID")}`;
    }
  };

  // Format tooltip detail untuk revenue
  const formatRevenueDetail = (amount) => {
    return `Rp ${(amount || 0).toLocaleString("id-ID")}`;
  };

  // Fetch all dashboard data
  const fetchDashboardData = async (period = "1") => {
    try {
      setLoading(true);

      // Fetch data secara paralel
      const [
        revenueResponse,
        statusResponse,
        overviewResponse,
        recentResponse,
      ] = await Promise.all([
        adminDashboardService.getRevenueOrdersData(period),
        adminDashboardService.getOrderStatusData(period),
        adminDashboardService.getDashboardOverview(period),
        adminDashboardService.getRecentOrders(),
      ]);

      // Set revenue data
      if (revenueResponse.success) {
        setRevenueData(revenueResponse.data);
      }

      // Set order status data - konversi dari persen ke jumlah
      if (statusResponse.success) {
        // Ubah data dari persentase menjadi jumlah order
        const statusDataWithCount = statusResponse.data.map((item) => ({
          ...item,
          count: item.count || 0, // Gunakan count yang sudah ada dari API
        }));
        setOrderStatusData(statusDataWithCount);
      }

      // Set overview stats
      if (overviewResponse.success) {
        const overview = overviewResponse.data;

        // Set revenue detail untuk tooltip
        setRevenueDetail({
          total: overview.total_revenue || 0,
          paid: overview.total_paid || 0,
          pending: (overview.total_revenue || 0) - (overview.total_paid || 0),
        });

        setStats([
          {
            title: "Total Orders",
            value: overview.total_orders?.toLocaleString() || "0",
            icon: ShoppingCart,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
            detail: `${overview.total_orders} orders`,
          },
          {
            title: "Pending Orders",
            value: overview.pending_orders?.toLocaleString() || "0",
            icon: Clock,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
            detail: `${overview.pending_orders} orders pending`,
          },
          {
            title: "Revenue",
            value: formatCurrency(overview.total_revenue),
            icon: DollarSign,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
            detail: `Total: ${formatRevenueDetail(overview.total_revenue)}`,
            hasDetail: true,
          },
          {
            title: "Customers",
            value: overview.total_customers?.toLocaleString() || "0",
            icon: Users,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
            detail: `${overview.total_customers} registered customers`,
          },
        ]);
      }

      // Set recent orders
      if (recentResponse.success) {
        setRecentOrders(recentResponse.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set default data jika error
      setStats([
        {
          title: "Total Orders",
          value: "0",
          icon: ShoppingCart,
          color: "text-gray-900",
          bgColor: "bg-gray-100",
          detail: "0 orders",
        },
        {
          title: "Pending Orders",
          value: "0",
          icon: Clock,
          color: "text-gray-900",
          bgColor: "bg-gray-100",
          detail: "0 orders pending",
        },
        {
          title: "Revenue",
          value: "Rp 0",
          icon: DollarSign,
          color: "text-gray-900",
          bgColor: "bg-gray-100",
          detail: "Total: Rp 0",
          hasDetail: true,
        },
        {
          title: "Customers",
          value: "0",
          icon: Users,
          color: "text-gray-900",
          bgColor: "bg-gray-100",
          detail: "0 registered customers",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (period) => {
    setFilterPeriod(period);
    fetchDashboardData(period);
  };

  // Fetch data on component mount and when filter changes
  useEffect(() => {
    fetchDashboardData(filterPeriod);
  }, [filterPeriod]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-800 bg-green-100";
      case "under_review":
        return "text-blue-800 bg-blue-100";
      case "waiting_payment":
        return "text-yellow-800 bg-yellow-100";
      case "payment_received":
        return "text-purple-800 bg-purple-100";
      case "printing":
        return "text-indigo-800 bg-indigo-100";
      case "final_touchup":
        return "text-pink-800 bg-pink-100";
      case "ready_to_ship":
        return "text-teal-800 bg-teal-100";
      case "cancelled":
        return "text-red-800 bg-red-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "under_review":
        return <AlertCircle className="w-4 h-4" />;
      case "waiting_payment":
        return <Clock className="w-4 h-4" />;
      case "payment_received":
        return <DollarSign className="w-4 h-4" />;
      case "printing":
        return <Package className="w-4 h-4" />;
      case "final_touchup":
        return <AlertCircle className="w-4 h-4" />;
      case "ready_to_ship":
        return <Box className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Cek struktur payload untuk memastikan urutan yang benar
      console.log("Tooltip Payload:", payload);

      const revenueValue =
        payload[0]?.dataKey === "revenue"
          ? payload[0]?.value
          : payload[1]?.value;
      const ordersValue =
        payload[0]?.dataKey === "orders"
          ? payload[0]?.value
          : payload[1]?.value;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-green-600">
            Revenue: {formatRevenueDetail(revenueValue)}
          </p>
          <p className="text-sm text-gray-900">
            Orders: {(ordersValue || 0).toLocaleString("id-ID")}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip untuk pie chart order status
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Orders: {payload[0].payload.count || 0}
          </p>
          <p className="text-sm text-gray-600">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>

        {/* Loading stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 sm:p-5 rounded-lg animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg animate-pulse">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3 mb-4 sm:mb-6"></div>
            <div className="h-60 sm:h-80 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg animate-pulse">
              <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3 mb-4 sm:mb-6"></div>
              <div className="h-32 sm:h-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Page Header dengan Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h1>

        {/* Filter Period */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterPeriod}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;

          return (
            <div
              key={index}
              className="bg-white p-4 sm:p-5 rounded-lg hover:shadow-md transition-shadow duration-200 relative"
              onMouseEnter={() => stat.hasDetail && setShowRevenueDetail(true)}
              onMouseLeave={() => stat.hasDetail && setShowRevenueDetail(false)}
            >
              {/* Revenue Detail Popup */}
              {stat.hasDetail && showRevenueDetail && revenueDetail && (
                <div className="absolute top-4 sm:top-5 left-1/2 transform -translate-x-1/2 -translate-y-full bg-white text-gray-900 p-3 rounded-lg shadow-sm z-10 min-w-48">
                  <div className="text-sm font-semibold mb-2 text-gray-900">
                    Revenue Details
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-medium text-gray-900">
                        {formatRevenueDetail(revenueDetail.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    {stat.hasDetail && (
                      <Eye className="w-3 h-3 text-gray-400 cursor-help" />
                    )}
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                  <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="space-y-4 sm:space-y-6">
        {/* Top Row: Revenue & Orders dan Order Status sejajar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Revenue & Orders Chart - Bar Chart */}
          <div className="bg-white shadow-sm p-4 sm:p-6 rounded-lg hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Revenue & Orders
              </h3>
              <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-1 sm:mr-2"></div>
                  <span className="text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-black rounded-full mr-1 sm:mr-2"></div>
                  <span className="text-gray-600">Orders</span>
                </div>
              </div>
            </div>
            <div className="h-60 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />

                  {/* YAxis untuk Revenue (Bar chart) */}
                  <YAxis
                    yAxisId="left"
                    stroke="#6B7280"
                    fontSize={10}
                    domain={[0, (dataMax) => (dataMax ? dataMax * 1.1 : 1000)]}
                    tickFormatter={(value) => {
                      if (value >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value;
                    }}
                  />

                  {/* YAxis untuk Orders (Line chart) - di sebelah kanan */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#6B7280"
                    fontSize={10}
                    domain={[0, (dataMax) => (dataMax ? dataMax * 1.1 : 10)]}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  {/* Bar chart untuk Revenue */}
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="#10B981"
                    radius={[2, 2, 0, 0]}
                    barSize={20}
                  />

                  {/* Line chart untuk Orders dengan titik di atas bar */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{
                      fill: "#000000",
                      strokeWidth: 2,
                      r: 3,
                      stroke: "#fff",
                    }}
                    activeDot={{
                      r: 4,
                      fill: "#000000",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    connectNulls={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Status Chart */}
          <div className="bg-white shadow-sm p-4 sm:p-6 rounded-lg hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Order Status
              </h3>
              <span className="text-xs sm:text-sm text-gray-500">
                {periodOptions.find((opt) => opt.value === filterPeriod)?.label}
              </span>
            </div>
            <div className="h-48 sm:h-64 -mt-2 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 -mt-2">
              {orderStatusData.map((status, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs sm:text-sm"
                >
                  <div className="flex items-center">
                    <div
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2"
                      style={{ backgroundColor: status.color }}
                    ></div>
                    <span className="text-gray-600 truncate">{status.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 ml-2">
                    {status.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Orders full width */}
        <div className="bg-white shadow-sm p-4 sm:p-6 rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Recent Orders
            </h3>
            <span className="text-xs sm:text-sm text-gray-500">Latest 7 orders</span>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 gap-2"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(order.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.customer}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{order.id}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:space-x-4 w-full sm:w-auto">
                  <p className="text-sm font-medium text-gray-900">
                    {order.amount}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No recent orders
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;