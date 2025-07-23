// Analytics.tsx with metric cards, view-all navigation, stacked/pie charts, filtering, export
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { PuffLoader } from "react-spinners";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from "recharts";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RootState } from "../../apps/store";
import { bookingsApi } from "../../features/api/bookingsApi";
import { paymentsApi } from "../../features/api/paymentsApi";
import { ticketsApi } from "../../features/api/ticketsApi";
import { userApi } from "../../features/api/userApi";
import { useGetAllVehiclesQuery } from '../../features/api/vehiclesApi';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28BE9"];

type User = { role: string };

const Analytics = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { data: bookingsData = [], isLoading: bookingsLoading } = bookingsApi.useGetAllBookingsQuery(undefined, { skip: !isAuthenticated });
  const { data: paymentsData = [], isLoading: paymentsLoading } = paymentsApi.useGetAllPaymentsQuery(undefined, { skip: !isAuthenticated });
  const { data: ticketsData = [], isLoading: ticketsLoading } = ticketsApi.useGetAllTicketsQuery(undefined, { skip: !isAuthenticated });
  const { data: usersData = [], isLoading: usersLoading } = userApi.useGetAllUsersProfilesQuery(undefined, { skip: !isAuthenticated });
  const { data: vehiclesData = [], isLoading: vehiclesLoading } = useGetAllVehiclesQuery(undefined, { skip: !isAuthenticated });
  

  const [filterStatus, setFilterStatus] = useState("All");

  const totalBookings = bookingsData.length;
  const filteredBookings = filterStatus === "All" ? bookingsData : bookingsData.filter(b => b.bookingStatus === filterStatus);
  const pendingBookings = filteredBookings.filter(b => b.bookingStatus === "Pending").length;
  const confirmedBookings = filteredBookings.filter(b => b.bookingStatus === "Confirmed").length;

  const totalPayments = paymentsData.length;
  const completedPayments = paymentsData.filter(p => p.paymentStatus === "Completed").length;
  const pendingPayments = paymentsData.filter(p => p.paymentStatus === "Pending").length;

  const totalRevenue = paymentsData.reduce((sum, p) => {
    const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount;
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const totalTickets = ticketsData.length;
  const openTickets = ticketsData.filter(t => t.status === "Open" || t.status === "Pending").length;
  const closedTickets = ticketsData.filter(t => t.status === "Closed").length;

  const totalUsers = usersData.length;
  const users = usersData.filter((u: User) => u.role === "user").length;
  const adminUsers = usersData.filter((u: User) => u.role === "admin").length;
  const disabledUsers = usersData.filter((u: User) => u.role === "disabled").length;

  const totalVehicles = vehiclesData.length;
  const availableVehicles = vehiclesData.filter(v => v.availability).length;
  const bookedVehicles = vehiclesData.filter(v => !v.availability).length;

  const anyLoading = bookingsLoading || paymentsLoading || ticketsLoading || usersLoading || vehiclesLoading;

  if (anyLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <PuffLoader color="#0aff13" size={80} />
        <span className="ml-4 text-blue-700 text-xl">Loading dashboard data...</span>
      </div>
    );
  }

  const chartData = [
    { name: 'Bookings', Pending: pendingBookings, Confirmed: confirmedBookings },
    { name: 'Payments', Pending: pendingPayments, Completed: completedPayments },
    { name: 'Tickets', Open: openTickets, Closed: closedTickets },
    { name: 'Users', Admin: adminUsers, User: users, Disabled: disabledUsers },
    { name: 'Vehicles', Available: availableVehicles, Booked: bookedVehicles },
  ];

  const pieData = [
    { name: "Confirmed", value: confirmedBookings },
    { name: "Pending", value: pendingBookings }
  ];

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Analytics Dashboard Summary", 14, 10);
    autoTable(doc, {
      startY: 20,
      head: [["Metric", "Value"]],
      body: [
        ["Total Bookings", totalBookings],
        ["Confirmed Bookings", confirmedBookings],
        ["Pending Bookings", pendingBookings],
        ["Total Payments", totalPayments],
        ["Completed Payments", completedPayments],
        ["Pending Payments", pendingPayments],
        ["Total Revenue", `Ksh ${totalRevenue.toFixed(2)}`],
        ["Open Tickets", openTickets],
        ["Closed Tickets", closedTickets],
        ["Total Users", totalUsers],
        ["Admins", adminUsers],
        ["Users", users],
        ["Disabled Users", disabledUsers],
        ["Available Vehicles", availableVehicles],
        ["Booked Vehicles", bookedVehicles],
      ],
    });
    doc.save("dashboard_summary.pdf");
  };

  const handlePrint = () => window.print();

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-6 text-purple-900">Admin Dashboard Overview</h1>



{/* Filters & Export */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="p-2 text-purple-600 border border-gray-300 rounded-md"
        >
          <option value="All">All Bookings</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Pending">Pending</option>
        </select>
        <div className="flex gap-2">
          <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Export PDF</button>
          <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Print</button>
        </div>
      </div>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{
          label: "Bookings", count: totalBookings, to: "/adminDashboard/AllBookings"
        }, {
          label: "Users", count: totalUsers, to: "/adminDashboard/AllUsers"
        }, {
          label: "Vehicles", count: totalVehicles, to: "/adminDashboard/AllVehicles"
        }, {
          label: "Tickets", count: totalTickets, to: "/adminDashboard/AllTickets"
        },{
          label: "Payments", count: totalPayments, to: "/adminDashboard/AllPayments"
        },
      
      ].map(({ label, count, to }) => (
          <div key={label} className="bg-white p-4 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-gray-700 mb-2">{label}</h2>
            <p className="text-2xl font-extrabold text-indigo-600">{count}</p>
            <Link to={to} className="inline-block mt-3 px-3 py-1 bg-white text-purple-600 rounded hover:bg-blue-200">View All</Link>
          </div>
        ))}
      </div>

    

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Stacked Bar Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(chartData[0]).filter(key => key !== "name").map((key, index) => (
                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Booking Status Pie</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-2xl font-bold mb-4">Analytics Summary Table</h2>
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-blue-600">Metric</th>
              <th className="p-2 text-blue-600">Details</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            <tr><td className="p-2">Total Bookings</td><td className="p-2">{totalBookings}</td></tr>
            <tr><td className="p-2">Confirmed Bookings</td><td className="p-2">{confirmedBookings}</td></tr>
            <tr><td className="p-2">Pending Bookings</td><td className="p-2">{pendingBookings}</td></tr>
            <tr><td className="p-2">Total Payments</td><td className="p-2">{totalPayments}</td></tr>
            <tr><td className="p-2">Completed Payments</td><td className="p-2">{completedPayments}</td></tr>
            <tr><td className="p-2">Pending Payments</td><td className="p-2">{pendingPayments}</td></tr>
            <tr><td className="p-2">Total Revenue</td><td className="p-2">Ksh {totalRevenue.toFixed(2)}</td></tr>
            <tr><td className="p-2">Open Tickets</td><td className="p-2">{openTickets}</td></tr>
            <tr><td className="p-2">Closed Tickets</td><td className="p-2">{closedTickets}</td></tr>
            <tr><td className="p-2">Total Users</td><td className="p-2">{totalUsers}</td></tr>
            <tr><td className="p-2">Admins</td><td className="p-2">{adminUsers}</td></tr>
            <tr><td className="p-2">Users</td><td className="p-2">{users}</td></tr>
            <tr><td className="p-2">Disabled Users</td><td className="p-2">{disabledUsers}</td></tr>
            <tr><td className="p-2">Available Vehicles</td><td className="p-2">{availableVehicles}</td></tr>
            <tr><td className="p-2">Booked Vehicles</td><td className="p-2">{bookedVehicles}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics