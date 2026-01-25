import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, Shield, BarChart3, MessageSquare } from "lucide-react";

const adminFunctions = [
  {
    title: "Customer Search",
    description: "Search and view all registered users with their details",
    icon: Users,
    path: "/admin/customers",
  },
  {
    title: "User Roles",
    description: "Manage user roles and permissions",
    icon: Shield,
    path: "/admin/roles",
  },
  {
    title: "Feedback",
    description: "Review and manage user feedback and support requests",
    icon: MessageSquare,
    path: "/admin/feedback",
  },
  {
    title: "Analytics",
    description: "View platform usage statistics and metrics",
    icon: BarChart3,
    path: "/admin/analytics",
    comingSoon: true,
  },
  {
    title: "Settings",
    description: "Configure platform settings and preferences",
    icon: Settings,
    path: "/admin/settings",
    comingSoon: true,
  },
];

export default function AdminDashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, roles, and platform settings
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminFunctions.map((func) => {
            const Icon = func.icon;
            const content = (
              <Card
                className={`transition-all hover:shadow-lg ${
                  func.comingSoon
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary cursor-pointer"
                }`}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {func.title}
                      {func.comingSoon && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{func.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );

            if (func.comingSoon) {
              return <div key={func.title}>{content}</div>;
            }

            return (
              <Link key={func.title} to={func.path}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
