import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import UserCard from "@/components/UserCard";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { FRIENDLY_DEPARTMENT_LABEL, WORKER_IDS } from "@/lib/enterprise/EnterpriseUserTypes";

export default function UsersPage() {
  const { company } = CompanyProfileStore.getCurrent();
  const { enterpriseUsers } = company;

  return (
    <>
      <PageHeader
        title="Enterprise Users"
        description={`${enterpriseUsers.length} simulated employees across ${company.profile.name}'s Digital Workforce — departments, roles, managers, and worker execute-access.`}
      />

      {enterpriseUsers.length === 0 ? (
        <div className="mt-10 rounded-xl bg-slate-900 p-8 text-center">
          <p className="text-sm text-slate-400">Invite employees to begin using Digital Workers.</p>
        </div>
      ) : (
        WORKER_IDS.map((workerId) => {
          const usersInDepartment = enterpriseUsers.filter((user) => user.departmentWorkerId === workerId);
          if (usersInDepartment.length === 0) return null;

          return (
            <div key={workerId} className="mt-10">
              <SectionTitle
                title={FRIENDLY_DEPARTMENT_LABEL[workerId]}
                description={`${usersInDepartment.length} ${usersInDepartment.length === 1 ? "user" : "users"}`}
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {usersInDepartment.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
