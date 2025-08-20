"use client";

import { useState } from "react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Toggle + College Coaches CTA Row */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                billingCycle === "monthly" ? "bg-gold text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                billingCycle === "annual" ? "bg-gold text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              Annual
            </button>
          </div>
          <div className="mt-4 md:mt-0 text-center md:text-right">
            <span className="mr-3 font-medium">Are you a College Coach or Recruiter?</span>
            <a
              href="/coach-signup"
              className="inline-block bg-gold text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-600"
            >
              Get Started Here
            </a>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Redshirt */}
          <div className="border rounded-lg shadow-sm flex flex-col">
            <div className="p-6 text-center">
              <h3 className="text-xl font-bold">Redshirt</h3>
              <p className="text-gray-500">Just starting the process</p>
              <p className="mt-4 text-3xl font-extrabold">FREE</p>
              <p className="text-gray-500">with ads</p>
              <a
                href="/signup/redshirt"
                className="mt-6 block w-full bg-gold text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-600"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Walk-On */}
          <div className="border rounded-lg shadow-sm flex flex-col">
            <div className="p-6 text-center">
              <h3 className="text-xl font-bold">Walk-On</h3>
              <p className="text-gray-500">Ready to compete</p>
              <p className="mt-4 text-3xl font-extrabold">
                {billingCycle === "monthly" ? "$24.95" : "$265"}
              </p>
              <p className="text-gray-500">
                {billingCycle === "monthly" ? "per month" : "per year (12% off)"}
              </p>
              <a
                href="/signup/walkon"
                className="mt-6 block w-full bg-gold text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-600"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* All-American */}
          <div className="border rounded-lg shadow-sm flex flex-col">
            <div className="p-6 text-center">
              <h3 className="text-xl font-bold">All-American</h3>
              <p className="text-gray-500">Time to get seen</p>
              <p className="mt-4 text-3xl font-extrabold">
                {billingCycle === "monthly" ? "$49.95" : "$510"}
              </p>
              <p className="text-gray-500">
                {billingCycle === "monthly" ? "per month" : "per year (15% off)"}
              </p>
              <a
                href="/signup/allamerican"
                className="mt-6 block w-full bg-gold text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-600"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>

        {/* Team Plan */}
        <div className="mt-12 border rounded-lg shadow-sm flex flex-col">
          <div className="p-6 text-center">
            <h3 className="text-xl font-bold">Teams</h3>
            <p className="text-gray-500">Every player, every step</p>
            <p className="mt-4 text-3xl font-extrabold">$39.95</p>
            <p className="text-gray-500">per player per month</p>
            <a
              href="/signup/teams"
              className="mt-6 block w-full bg-gold text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-600"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
