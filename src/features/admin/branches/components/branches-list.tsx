"use client";

import { MapPin, Plus, Edit, Phone, Mail, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { DeleteBranchButton } from "./delete-branch-button";

interface Branch {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  image_url?: string;
  is_active: boolean;
}

interface BranchWithSpecialistCount extends Branch {
  specialist_count?: number;
}

interface BranchesListProps {
  branches: Branch[];
}

export function BranchesList({ branches }: BranchesListProps) {
  const [branchesWithCounts, setBranchesWithCounts] = useState<
    BranchWithSpecialistCount[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialistCounts = async () => {
      try {
        const supabase = createClient();

        // Get specialist counts for each branch
        const branchIds = branches.map((branch) => branch.id);
        const { data: specialistCounts, error } = await supabase
          .from("specialists")
          .select("branch_id")
          .in("branch_id", branchIds);

        if (error) throw error;

        // Count specialists per branch
        const countMap = specialistCounts.reduce(
          (acc, specialist) => {
            acc[specialist.branch_id] = (acc[specialist.branch_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        // Add counts to branches
        const branchesWithCounts = branches.map((branch) => ({
          ...branch,
          specialist_count: countMap[branch.id] || 0,
        }));

        setBranchesWithCounts(branchesWithCounts);
      } catch (error) {
        console.error("Error fetching specialist counts:", error);
        setBranchesWithCounts(
          branches.map((branch) => ({ ...branch, specialist_count: 0 })),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialistCounts();
  }, [branches]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Branches
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage all branch locations
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/branches/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Link>
        </Button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(loading ? branches : branchesWithCounts).map((branch) => (
          <Card key={branch.id} className="overflow-hidden p-0">
            {branch.image_url && (
              <div className="relative h-48 w-full flex-shrink-0">
                <Image
                  src={branch.image_url}
                  alt={branch.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {branch.name}
                  </h3>
                  <div className="mt-2 flex items-start text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="mr-1 mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      {branch.address}
                      {branch.city && `, ${branch.city}`}
                      {branch.country && `, ${branch.country}`}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={branch.is_active ? "default" : "secondary"}
                  className="ml-2 flex-shrink-0"
                >
                  {branch.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mt-4 space-y-1 flex-1">
                {branch.phone && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="mr-2 h-4 w-4" />
                    {branch.phone}
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="mr-2 h-8 w-4" />
                    {branch.email}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Users className="mr-2 h-4 w-4" />
                  {loading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    <span>
                      {(branch as BranchWithSpecialistCount).specialist_count ||
                        0}{" "}
                      specialists
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/admin/branches/${branch.id}`}>
                    <Edit className="mr-1 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
                <DeleteBranchButton
                  branchId={branch.id}
                  branchName={branch.name}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
