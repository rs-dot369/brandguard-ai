"use client";
import { useState, useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://brandguard-ai-backend-m9r2.onrender.com";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 4 seconds to catch new audit violation alerts instantly
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition focus:outline-none"
      >
        <svg className="w-5 h-5 text-slate-600 hover:text-[#4F46E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
            <span className="font-semibold text-sm text-white">Notifications & Alerts</span>
            <span className="text-xs text-indigo-400">{unreadCount} unread</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-700">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">No notifications found</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`p-3 text-sm transition hover:bg-gray-700/50 ${notif.read ? 'opacity-60' : 'bg-gray-800/80'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-white">{notif.title}</span>
                    <span className="text-[10px] text-gray-400">{notif.timestamp}</span>
                  </div>
                  <p className="test-xs text-gray-300 mb-2">{notif.message}</p>
                  {!notif.read && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Mark as read ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}