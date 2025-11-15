'use client';

import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Sample data for different chart types
const salesData = [
  { month: 'Jan', sales: 45000, orders: 120, revenue: 850000 },
  { month: 'Feb', sales: 52000, orders: 140, revenue: 920000 },
  { month: 'Mar', sales: 48000, orders: 130, revenue: 870000 },
  { month: 'Apr', sales: 61000, orders: 165, revenue: 1150000 },
  { month: 'May', sales: 55000, orders: 150, revenue: 980000 },
  { month: 'Jun', sales: 67000, orders: 180, revenue: 1200000 },
];

// Brand colors - Black and Gold theme
const BRAND_COLORS = {
  primary: '#f8c017', // Gold
  secondary: '#1a1a1a', // Black
  accent1: '#2a2a2a', // Dark Gray
  accent2: '#404040', // Medium Gray
  accent3: '#ffd700', // Light Gold
  accent4: '#0a0a0a', // Deep Black
};

const categoryData = [
  { name: 'Electronics', value: 35, amount: 420000, color: BRAND_COLORS.primary },
  { name: 'Fashion', value: 25, amount: 300000, color: BRAND_COLORS.secondary },
  { name: 'Home & Garden', value: 20, amount: 240000, color: BRAND_COLORS.accent1 },
  { name: 'Sports', value: 12, amount: 144000, color: BRAND_COLORS.accent2 },
  { name: 'Books', value: 8, amount: 96000, color: BRAND_COLORS.accent3 },
];

const performanceData = [
  { week: 'Week 1', orders: 45, delivery: 42, satisfaction: 4.5 },
  { week: 'Week 2', orders: 52, delivery: 50, satisfaction: 4.3 },
  { week: 'Week 3', orders: 48, delivery: 46, satisfaction: 4.6 },
  { week: 'Week 4', orders: 61, delivery: 59, satisfaction: 4.4 },
];

const revenueData = [
  { day: 'Mon', current: 12000, previous: 10000 },
  { day: 'Tue', current: 15000, previous: 12000 },
  { day: 'Wed', current: 18000, previous: 14000 },
  { day: 'Thu', current: 22000, previous: 18000 },
  { day: 'Fri', current: 25000, previous: 20000 },
  { day: 'Sat', current: 19000, previous: 16000 },
  { day: 'Sun', current: 16000, previous: 13000 },
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-black border border-brand-gold rounded-lg p-3 shadow-gold">
        <p className="text-brand-gold font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || '#f8c017' }} className="text-sm text-white">
            {`${entry.dataKey}: ${typeof entry.value === 'number' && entry.dataKey?.includes('revenue') ? 
              `₦${entry.value.toLocaleString()}` : 
              entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Revenue Area Chart
// Revenue Area Chart
export function RevenueChart({ data = [] }: { data?: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data.length > 0 ? data : salesData}>
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f8c017" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#f8c017" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="month" stroke="#f8c017" fontSize={12} />
        <YAxis stroke="#f8c017" fontSize={12} tickFormatter={(value) => `₦${(value/1000)}K`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="revenue" stroke="#f8c017" fillOpacity={1} fill="url(#goldGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Sales Performance Bar Chart
export function SalesChart({ data = [] }: { data?: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.length > 0 ? data : salesData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="month" stroke="#f8c017" fontSize={12} />
        <YAxis stroke="#f8c017" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="sales" fill="#f8c017" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Category Distribution Pie Chart
export function CategoryChart({ data = [] }: { data?: any[] }) {
  const chartData = data.length > 0 ? data : categoryData;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#f8c017"
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#f8c017'} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Orders Performance Line Chart
export function OrdersChart({ data = [] }: { data?: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.length > 0 ? data : performanceData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="week" stroke="#f8c017" fontSize={12} />
        <YAxis stroke="#f8c017" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#f8c017' }} />
        <Line type="monotone" dataKey="orders" stroke="#f8c017" strokeWidth={3} dot={{ fill: '#f8c017', strokeWidth: 2, r: 5 }} />
        <Line type="monotone" dataKey="delivery" stroke="#1a1a1a" strokeWidth={3} dot={{ fill: '#1a1a1a', strokeWidth: 2, r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Daily Revenue Comparison Bar Chart
export function DailyRevenueChart({ data = [] }: { data?: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.length > 0 ? data : revenueData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="day" stroke="#f8c017" fontSize={12} />
        <YAxis stroke="#f8c017" fontSize={12} tickFormatter={(value) => `₦${(value/1000)}K`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#f8c017' }} />
        <Bar dataKey="current" fill="#f8c017" name="This Week" radius={[2, 2, 0, 0]} />
        <Bar dataKey="previous" fill="#404040" name="Last Week" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Admin specific charts
const userGrowthData = [
  { month: 'Jan', users: 1200, businesses: 45 },
  { month: 'Feb', users: 1350, businesses: 52 },
  { month: 'Mar', users: 1580, businesses: 61 },
  { month: 'Apr', users: 1720, businesses: 68 },
  { month: 'May', users: 1950, businesses: 75 },
  { month: 'Jun', users: 2180, businesses: 83 },
];

const systemHealthData = [
  { time: '00:00', cpu: 45, memory: 62, disk: 30 },
  { time: '04:00', cpu: 38, memory: 58, disk: 32 },
  { time: '08:00', cpu: 65, memory: 71, disk: 35 },
  { time: '12:00', cpu: 78, memory: 82, disk: 38 },
  { time: '16:00', cpu: 82, memory: 85, disk: 42 },
  { time: '20:00', cpu: 71, memory: 78, disk: 40 },
];

export function UserGrowthChart({ data = [] }: { data?: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.length > 0 ? data : userGrowthData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="month" stroke="#f8c017" fontSize={12} />
        <YAxis stroke="#f8c017" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#f8c017' }} />
        <Line type="monotone" dataKey="users" stroke="#f8c017" strokeWidth={3} name="Total Users" />
        <Line type="monotone" dataKey="businesses" stroke="#1a1a1a" strokeWidth={3} name="Businesses" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SystemHealthChart({ data = [] }: { data?: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data.length > 0 ? data : systemHealthData}>
        <defs>
          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f8c017" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#f8c017" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="time" stroke="#f8c017" fontSize={12} />
        <YAxis stroke="#f8c017" fontSize={12} tickFormatter={(value) => `${value}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#f8c017' }} />
        <Area type="monotone" dataKey="cpu" stackId="1" stroke="#f8c017" fill="url(#cpuGradient)" name="CPU Usage" />
        <Area type="monotone" dataKey="memory" stackId="2" stroke="#1a1a1a" fill="url(#memoryGradient)" name="Memory Usage" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Logistics specific charts
const deliveryData = [
  { region: 'Lagos', onTime: 94, delayed: 6, total: 450 },
  { region: 'Abuja', onTime: 91, delayed: 9, total: 320 },
  { region: 'Port Harcourt', onTime: 88, delayed: 12, total: 280 },
  { region: 'Kano', onTime: 85, delayed: 15, total: 200 },
  { region: 'Ibadan', onTime: 92, delayed: 8, total: 350 },
];

const routeEfficiencyData = [
  { week: 'Week 1', distance: 2500, time: 45, fuel: 280 },
  { week: 'Week 2', distance: 2300, time: 42, fuel: 260 },
  { week: 'Week 3', distance: 2100, time: 38, fuel: 240 },
  { week: 'Week 4', distance: 1900, time: 35, fuel: 220 },
];

export function DeliveryPerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={deliveryData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="region" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" tickFormatter={(value) => `${value}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="onTime" stackId="a" fill="#f8c017" name="On Time" />
        <Bar dataKey="delayed" stackId="a" fill="#666666" name="Delayed" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RouteEfficiencyChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={routeEfficiencyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="week" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="distance" stroke="#f8c017" strokeWidth={2} name="Distance (km)" />
        <Line type="monotone" dataKey="time" stroke="#1a1a1a" strokeWidth={2} name="Time (hours)" />
      </LineChart>
    </ResponsiveContainer>
  );
}