import {getSession} from "@/lib/auth";
import {redirect} from "next/navigation";
import {listStaffUsers} from "@/lib/staff/users";
import {AdminUsers} from "@/components/staff/AdminUsers";
export default async function UsersPage(){if(!await getSession())redirect("/admin/login");const data=await listStaffUsers();return <AdminUsers initial={data}/>;}
