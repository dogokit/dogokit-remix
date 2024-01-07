import { conform, useForm, useInputEvent } from "@conform-to/react"
import { getFieldsetConstraint, parse } from "@conform-to/zod"
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
import { useRef, useState } from "react"
import { z } from "zod"

import { EditorTiptapHook } from "~/components/libs/editor-tiptap"
import { FormDelete } from "~/components/shared/form-delete"
import { FormUpdatePublish } from "~/components/shared/form-update-publish"
import { FormUpdateStatus } from "~/components/shared/form-update-status"
import { Timestamp } from "~/components/shared/timestamp"
import { Button } from "~/components/ui/button"
import { ButtonLink } from "~/components/ui/button-link"
import { ButtonLoading } from "~/components/ui/button-loading"
import { FormErrors } from "~/components/ui/form"
import { Iconify } from "~/components/ui/iconify"
import { Separator } from "~/components/ui/separator"
import { TextareaAutosize } from "~/components/ui/textarea-autosize"
import { requireUser } from "~/helpers/auth"
import { useAppAdminLoaderData } from "~/hooks/use-app-loader-data"
import { db } from "~/libs/db.server"
import { modelAdminPage } from "~/models/admin-page.server"
import { schemaPage } from "~/schemas/page"
import { invariant, invariantResponse } from "~/utils/invariant"
import { createMeta } from "~/utils/meta"
import { createSitemap } from "~/utils/sitemap"
import { createSlug, truncateText } from "~/utils/string"
import { createTimer } from "~/utils/timer"

export const handle = createSitemap()

export const meta: MetaFunction<typeof loader> = ({ params, data }) => {
  const page = data?.page

  if (!page) {
    return createMeta({
      title: "Page not found",
      description: `Cannot find page with slug ${params.pageSlug}`,
    })
  }
  return createMeta({
    title: page.title,
    description: page.description,
  })
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  invariant(params.pageId, "params.pageId unavailable")
  const page = await modelAdminPage.getById({ id: params.pageId })
  invariantResponse(page, "Page not found", { status: 404 })
  return json({ page })
}

export default function UserPagesPageIdRoute() {
  const { page } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const { pageStatuses } = useAppAdminLoaderData()

  const [form, { id, slug, title, content }] = useForm<
    z.infer<typeof schemaPage>
  >({
    id: "update-page",
    lastSubmission: actionData?.submission,
    shouldRevalidate: "onInput",
    constraint: getFieldsetConstraint(schemaPage),
    onValidate({ formData }) {
      return parse(formData, { schema: schemaPage })
    },
    defaultValue: { ...page, userId: page.userId },
  })

  const isSubmitting = navigation.state === "submitting"
  const isPageUpdated = page.createdAt !== page.updatedAt
  const isPageDraft = page.status.symbol === "DRAFT"

  const [titleValue, setTitleValue] = useState(title.defaultValue ?? "")
  const slugRef = useRef<HTMLInputElement>(null)
  const slugControl = useInputEvent({ ref: slugRef })

  const [contentValue, setContentValue] = useState(content.defaultValue ?? "")
  const contentRef = useRef<HTMLInputElement>(null)
  const contentControl = useInputEvent({ ref: contentRef })

  function handleReset() {
    form.ref.current?.reset()
    setTitleValue(page.title)
    setContentValue(page.content)
  }

  function handleUpdateSlug() {
    const newSlug = createSlug(titleValue)
    slugControl.change(newSlug)
  }

  function handleUpdateContent(htmlString: string) {
    contentControl.change(htmlString)
  }

  if (!page) return null

  return (
    <div className="app-container">
      <Form replace method="POST" {...form.props}>
        <fieldset className="space-y-8" disabled={isSubmitting}>
          <section className="app-section">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLoading
                  variant="outline"
                  size="xs"
                  loadingText="Saving"
                  isLoading={isSubmitting}
                  iconComponent={<Iconify icon="ph:floppy-disk-duotone" />}
                >
                  <span>Save</span>
                </ButtonLoading>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleReset}
                >
                  <Iconify icon="ph:arrow-counter-clockwise" />
                  <span>Reset</span>
                </Button>
                <FormDelete
                  action="/admin/pages/delete"
                  intentValue="user-delete-page-by-id"
                  defaultValue={page.id}
                  itemText={`a page: ${truncateText(page.title)} (${
                    page.slug
                  })`}
                />
                <ButtonLink
                  variant="outline"
                  size="xs"
                  to={`/${page.slug}`}
                  disabled={isPageDraft}
                >
                  <Iconify icon="ph:arrow-square-out-duotone" />
                  <span>View</span>
                </ButtonLink>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FormUpdatePublish
                  itemName={page.title}
                  itemId="pageId"
                  action="/admin/posts/update"
                  intentValue="update-page-publish"
                  item={page}
                />

                <FormUpdateStatus
                  itemId="pageId"
                  action="/admin/pages/update"
                  intentValue="update-page-status"
                  dialogTitle="Update page's status"
                  dialogDescription={`Update the status of page: ${page.title} (${page.slug})`}
                  buttonText="Update Status"
                  itemStatuses={pageStatuses}
                  item={page}
                />
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-prose space-y-4">
            <input type="hidden" {...conform.input(id)} />

            <div className="text-xs text-muted-foreground">
              <Timestamp
                isUpdated={isPageUpdated}
                createdAt={page.createdAt}
                updatedAt={page.updatedAt}
              />
            </div>

            <div>
              <div className="flex justify-between gap-2">
                <input
                  {...conform.input(slug)}
                  ref={slugRef}
                  placeholder="untitled"
                  spellCheck="false"
                  className="input-natural flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleUpdateSlug}
                >
                  <Iconify icon="ph:lightbulb-duotone" />
                  <span>Generate Slug</span>
                </Button>
              </div>
              <FormErrors>{slug}</FormErrors>
            </div>

            <div>
              <TextareaAutosize
                name={title.name}
                minRows={1}
                defaultValue={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                placeholder="Untitled"
                spellCheck="false"
                className="input-natural w-full resize-none text-4xl font-semibold"
              />
              <FormErrors>{title}</FormErrors>
            </div>

            <Separator className="my-4" />

            <div>
              <FormErrors>{content}</FormErrors>
              <input
                {...conform.input(content, { hidden: true })}
                ref={contentRef}
                onChange={e => setContentValue(e.target.value)}
              />
              <EditorTiptapHook
                content={contentValue}
                handleUpdate={handleUpdateContent}
              />
            </div>

            {/* Manual textarea editor */}
            <div className="hidden">
              <textarea
                placeholder="Add some content..."
                spellCheck="false"
                cols={30}
                rows={20}
                className="input-natural resize-none"
              />
            </div>
          </section>
        </fieldset>
      </Form>
    </div>
  )
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { userId } = await requireUser(request)

  const timer = createTimer()
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  const submission = await parse(formData, {
    async: true,
    schema: schemaPage.superRefine(async (data, ctx) => {
      const { id, slug } = data
      const existingSlug = await db.page.findUnique({
        where: { slug, NOT: { id } },
        select: { id: true },
      })
      if (existingSlug) {
        ctx.addIssue({
          path: ["slug"],
          code: z.ZodIssueCode.custom,
          message: "Slug cannot be used, please change",
        })
        return
      }
    }),
  })

  if (!submission.value || submission.intent !== "submit") {
    await timer.delay()
    return json({ status: "error", submission }, { status: 400 })
  }

  const page = await modelAdminPage.update({ userId, ...submission.value })

  await timer.delay()
  return redirect(`/admin/pages/${page.id}`)
}