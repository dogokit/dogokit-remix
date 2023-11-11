import { conform, useForm } from "@conform-to/react"
import { getFieldsetConstraint, parse } from "@conform-to/zod"
import {
  json,
  type ActionFunctionArgs,
  type MetaFunction,
} from "@remix-run/node"
import {
  Form,
  useActionData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react"
import { z } from "zod"
import { AuthButtons } from "~/components/shared/auth-buttons"

import { Alert } from "~/components/ui/alert"
import { ButtonLoading } from "~/components/ui/button-loading"
import { FormDescription, FormField, FormLabel } from "~/components/ui/form"
import { Input, InputPassword } from "~/components/ui/input"
import { LinkText } from "~/components/ui/link-text"
import { useAppMode } from "~/hooks/use-app-mode"
import { prisma } from "~/libs/db.server"
import { schemaUserLogIn } from "~/schemas/user"
import { authenticator } from "~/services/auth.server"
import { checkPassword } from "~/utils/encryption.server"
import { createMeta } from "~/utils/meta"
import { createTimer } from "~/utils/timer"

export const meta: MetaFunction = () =>
  createMeta({
    title: `Log In`,
    description: `Continue to dashboard`,
  })

export const loader = ({ request }: ActionFunctionArgs) => {
  return authenticator.isAuthenticated(request, {
    successRedirect: "/user/dashboard",
  })
}

export default function SignUpRoute() {
  const actionData = useActionData<typeof action>()

  const { isModeDevelopment } = useAppMode()

  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo")

  const [form, { email, password }] = useForm<z.infer<typeof schemaUserLogIn>>({
    id: "login-form",
    lastSubmission: actionData?.submission,
    shouldValidate: "onSubmit",
    shouldRevalidate: "onInput",
    constraint: getFieldsetConstraint(schemaUserLogIn),
    onValidate({ formData }) {
      return parse(formData, { schema: schemaUserLogIn })
    },
    defaultValue: isModeDevelopment
      ? {
          email: "example@example.com",
          password: "exampleexample",
        }
      : {},
  })

  return (
    <div className="site-container">
      <div className="mx-auto max-w-sm space-y-10">
        <header className="space-y-4">
          <h2>Log in to continue</h2>
          <p>
            Don't have an account? <LinkText to="/signup">Sign up</LinkText>
          </p>
        </header>

        <Form
          action="/login"
          method="POST"
          className="flex flex-col gap-2"
          {...form.props}
        >
          <fieldset className="flex flex-col gap-2" disabled={isSubmitting}>
            {redirectTo ? (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            ) : null}

            <FormField>
              <FormLabel htmlFor={email.id}>Email</FormLabel>
              <Input
                {...conform.input(email, { type: "email", description: true })}
                id={email.id}
                placeholder="yourname@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus={email.error ? true : undefined}
                required
              />
              {email.errors && email.errors?.length > 0 && (
                <ul>
                  {email.errors?.map((error, index) => (
                    <li key={index}>
                      <Alert variant="destructive">{error}</Alert>
                    </li>
                  ))}
                </ul>
              )}
            </FormField>

            <FormField>
              <FormLabel htmlFor={password.id}>Password</FormLabel>
              <InputPassword
                {...conform.input(password, {
                  description: true,
                })}
                id={password.id}
                placeholder="Enter password"
                autoComplete="current-password"
                autoFocus={password.error ? true : undefined}
                required
              />
              <FormDescription id={password.descriptionId}>
                At least 8 characters
              </FormDescription>
              {password.errors && password.errors?.length > 0 && (
                <ul>
                  {password.errors?.map((error, index) => (
                    <li key={index}>
                      <Alert variant="destructive">{error}</Alert>
                    </li>
                  ))}
                </ul>
              )}
            </FormField>

            <ButtonLoading
              type="submit"
              loadingText="Logging In..."
              isLoading={isSubmitting}
            >
              Log In
            </ButtonLoading>
          </fieldset>
        </Form>

        <section className="flex flex-col">
          <hr className="h-0 border-t" />
          <div className="-mt-2 text-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">OR</span>
          </div>
        </section>

        <section className="space-y-2">
          <AuthButtons />
        </section>
      </div>
    </div>
  )
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const timer = createTimer()
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  const submission = await parse(formData, {
    schema: schemaUserLogIn.superRefine(async (data, ctx) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        include: { password: true },
      })
      if (!existingUser) {
        ctx.addIssue({
          path: ["email"],
          code: z.ZodIssueCode.custom,
          message: "User with this email is not found",
        })
        return
      }
      if (!existingUser?.password) {
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message:
            "User cannot log in with a password. Try using 3rd party services below",
        })
        return
      }

      const isPasswordCorrect = await checkPassword(
        data.password,
        existingUser.password.hash,
      )
      if (!isPasswordCorrect) {
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message: "Password is incorrect",
        })
        return
      }
    }),
    async: true,
  })

  await timer.delay()

  if (!submission.value || submission.intent !== "submit") {
    return json({ status: "error", submission }, { status: 400 })
  }

  return authenticator.authenticate("form", request, {
    successRedirect: "/user/dashboard",
  })
}
