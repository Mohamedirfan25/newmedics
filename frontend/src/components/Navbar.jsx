export default function Navbar(){
  return (
    <nav className="bg-blue-600 text-white p-4 shadow">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="font-bold text-xl">MediScan++</div>
        <div className="space-x-6">
          <a href="#" className="hover:text-blue-100">Dashboard</a>
          <a href="#" className="hover:text-blue-100">Records</a>
          <a href="#" className="hover:text-blue-100">Reminders</a>
          <a href="#" className="hover:text-blue-100">Profile</a>
        </div>
      </div>
    </nav>
  );
}
