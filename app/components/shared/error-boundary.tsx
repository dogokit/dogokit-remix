import {
  isRouteErrorResponse,
  useLocation,
  useParams,
  useRouteError,
  type ErrorResponse,
} from "@remix-run/react"
import { Anchor } from "../ui/anchor"
import { ButtonLink } from "../ui/button-link"
// import { captureRemixErrorBoundaryError } from '@sentry/remix'

type StatusHandler = (info: {
  error: ErrorResponse
  params: Record<string, string | undefined>
}) => JSX.Element | null

export function GeneralErrorBoundary({
  defaultStatusHandler = ({ error }) => <GeneralErrorMessage error={error} />,
  statusHandlers,
  unexpectedErrorHandler = error => (
    <GeneralErrorMessage error={error as ErrorResponse} />
  ),
}: {
  defaultStatusHandler?: StatusHandler
  statusHandlers?: Record<number, StatusHandler>
  unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}) {
  const params = useParams()
  const error = useRouteError()

  // TODO: captureRemixErrorBoundaryError(error)

  if (typeof document !== "undefined") {
    console.error(error)
  }

  return (
    <div className="site-container">
      {isRouteErrorResponse(error)
        ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
            error,
            params,
          })
        : unexpectedErrorHandler(error)}
    </div>
  )
}

export function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }
  console.error("Unable to get error message for error", error)
  return "Unknown Error"
}

export function GeneralErrorMessage({ error }: { error: ErrorResponse }) {
  const location = useLocation()

  return (
    <>
      <section className="prose-config site-section">
        <h1>Sorry, something went wrong</h1>
        <p>
          The requested page either doesn’t exist or you don’t have access to
          it.
        </p>
        <ul>
          <li>Might because cannot find page "{location.pathname}"</li>
          <li>
            {error.status} {error.data}
          </li>
        </ul>
      </section>

      <ErrorHelpInformation />
    </>
  )
}

export function ErrorHelpInformation() {
  return (
    <>
      <section className="site-section">
        <div className="flex gap-2">
          <ButtonLink to="/">Go to Home</ButtonLink>
          <ButtonLink to="/help">Go to Help</ButtonLink>
        </div>
      </section>

      <section className="site-section prose-config">
        <h2>Did you follow a link from here?</h2>
        <p>
          If you reached this page from another part of basecamp.com, please let
          us know so we can correct our mistake.
        </p>

        <h2>Did you follow a link from another site?</h2>
        <p>
          Links from other sites can sometimes be outdated or misspelled. Let us
          know where you came from and we can try to contact the other site in
          order to fix the problem.
        </p>

        <h2>Did you type the URL?</h2>
        <p>
          You may have typed the address (URL) incorrectly. Check to make sure
          you’ve got the exact right spelling, capitalization, etc. You can view
          our footer below for links to our most popular content.
        </p>

        <small>
          This error information is inspired by{" "}
          <Anchor href="https://basecamp.com">Basecamp</Anchor>
        </small>
      </section>
    </>
  )
}