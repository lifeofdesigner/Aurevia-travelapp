import {redirect} from "next/navigation";

import {type Locale} from "@/lib/i18n/routing";

export default function AdminLiveChatPage({params}: {params: {locale: Locale}}) {
  redirect(`/${params.locale}/admin/live-chat/inbox`);
}
