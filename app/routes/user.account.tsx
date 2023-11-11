import { conform, useForm } from "@conform-to/react"
import { parse } from "@conform-to/zod"
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node"
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react"
import { type z } from "zod"

import { ButtonLoading } from "~/components/ui/button-loading"
import { Input } from "~/components/ui/input"
import { modelUser } from "~/models/user.server"
import { schemaGeneralId } from "~/schemas/general"
import { authenticator } from "~/services/auth.server"
import { createMeta } from "~/utils/meta"
import { createTimer } from "~/utils/timer"

export const meta: MetaFunction = () =>
  createMeta({
    title: `User Account`,
    description: `Manage user account`,
  })

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  })

  return json({ user })
}

export default function UserAccountRoute() {
  const { user } = useLoaderData<typeof loader>()
  const lastSubmission = useActionData<typeof action>()

  const navigation = useNavigation()
  const isProcessing = navigation.state !== "idle"

  const [form, { id }] = useForm<z.infer<typeof schemaGeneralId>>({
    id: "delete-account",
    lastSubmission,
    defaultValue: { id: user.id },
  })

  return (
    <div className="site-container">
      <section className="site-section">
        <header className="space-y-2">
          <h2>Delete Account</h2>
          <p>
            By deleting your account, all of your personal data will be deleted.
          </p>
        </header>

        <Form method="POST" {...form.props}>
          <fieldset disabled={isProcessing}>
            <Input {...conform.input(id, { type: "hidden" })} required />
            <ButtonLoading
              variant="destructive"
              type="submit"
              loadingText="Deleting account..."
              isLoading={isProcessing}
            >
              Delete account
            </ButtonLoading>
          </fieldset>
        </Form>
      </section>
    </div>
  )
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const timer = createTimer()
  const formData = await request.formData()

  const submission = parse(formData, { schema: schemaGeneralId })
  if (!submission.value || submission.intent !== "submit") {
    return json(submission, { status: 400 })
  }

  const result = await modelUser.deleteById(submission.value)
  if (!result) return json(submission, { status: 500 })

  await timer.delay(5000)
  return redirect("/")
}
