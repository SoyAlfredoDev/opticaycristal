import { CustomerCategories } from "@/components/clients/CustomerCategories";
import { currentCustomer } from "@/lib/clients/current";
import { getCustomerTiers } from "@/lib/clients/store";
export default async function CategoriesPage(){const [customer,tiers]=await Promise.all([currentCustomer(),getCustomerTiers()]);return <CustomerCategories tiers={tiers} currentCategory={customer.tier.code}/>;}
