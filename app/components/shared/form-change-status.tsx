import { type PostStatus, type Prisma } from "@prisma/client"
import { useFetcher } from "@remix-run/react"
import { useState } from "react"

import { BadgePostStatus } from "~/components/shared/badge-post-status"
import { IconPostStatus } from "~/components/shared/icon-post-status"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { ButtonLoading } from "~/components/ui/button-loading"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { type modelPost } from "~/models/post.server"

export function FormChangeStatus({
  itemId = "itemId",
  action = "/user/items/patch",
  intentValue = "change-item-status",

  dialogTitle = "Change Status",
  dialogDescription = "Change the status of this item",

  item,
  itemStatuses,
}: {
  itemId: string
  action: string // Example: /user/items/patch
  intentValue: string // Example: change-post-status

  dialogTitle: string
  dialogDescription: string

  // IDEA: Make it more general with a model Item that has a Status
  itemStatuses: PostStatus[]
  item: Prisma.PromiseReturnType<typeof modelPost.getWithStatus>
}) {
  const [open, setOpen] = useState<boolean>()
  const fetcher = useFetcher()
  const isLoading =
    fetcher.state !== "submitting" && fetcher.formMethod === "POST"

  if (!item || !item.status || !itemStatuses) return null

  const statusSymbol = fetcher.formData
    ? fetcher.formData.get("statusSymbol")
    : item.status.symbol

  const statusOptimistic =
    itemStatuses.find(status => status.symbol === statusSymbol) || item.status

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className="focus-ring rounded-full">
        <BadgePostStatus status={statusOptimistic} className="cursor-pointer" />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        <fetcher.Form
          method="PATCH"
          action={action}
          onSubmit={event => {
            fetcher.submit(event.currentTarget.form, { method: "PATCH" })
            setOpen(false)
          }}
          className="space-y-2"
        >
          <div>
            <input type="hidden" name={itemId} defaultValue={item.id} />

            <Select name="statusSymbol" defaultValue={item.status.symbol}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {itemStatuses.map(status => {
                    return (
                      <SelectItem key={status.id} value={status.symbol}>
                        <p className="inline-flex items-center gap-2">
                          <IconPostStatus status={status} />
                          <span className="font-semibold">{status.name}</span>
                        </p>
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <ul className="space-y-1">
              {itemStatuses.map(status => {
                return (
                  <li key={status.id}>
                    <p className="text-xs text-muted-foreground">
                      <IconPostStatus status={status} />
                      <span className="font-semibold"> {status.name}:</span>
                      <span> {status.description}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>

            <ButtonLoading
              type="submit"
              size="sm"
              loadingText="Changing..."
              name="intent"
              value={intentValue}
              isLoading={isLoading}
            >
              Change
            </ButtonLoading>
          </AlertDialogFooter>
        </fetcher.Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
