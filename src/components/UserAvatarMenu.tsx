import { isAuthenticatedAtom, logoutAtom, usernameAtom } from '@/store/authSlice'
import * as Avatar from '@radix-ui/react-avatar'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAtomValue, useSetAtom } from 'jotai'
import { useNavigate } from 'react-router-dom'

/**
 * UserAvatarMenu
 * Shows an avatar icon; clicking opens a dropdown.
 * - Authenticated: Logout option
 * - Guest: Login option
 */
export function UserAvatarMenu() {
  const isAuthenticated: boolean = useAtomValue(isAuthenticatedAtom)
  const username: string | null = useAtomValue(usernameAtom)
  const logout = useSetAtom(logoutAtom)
  const navigate = useNavigate()

  const label: string = username ? username : 'Guest'
  const initial: string = username && username.length > 0 ? username.charAt(0).toUpperCase() : 'G'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="User menu"
          className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-100 text-sm font-medium shadow hover:border-indigo-500 hover:ring-2 hover:ring-indigo-300 dark:border-gray-600 dark:bg-gray-700"
        >
          <Avatar.Root className="relative flex h-full w-full select-none items-center justify-center">
            <Avatar.Image src={undefined} alt={label} className="h-full w-full rounded-full object-cover opacity-0" />
            <Avatar.Fallback
              delayMs={200}
              className="flex h-full w-full items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white"
            >
              {initial}
            </Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="min-w-[160px] rounded-md border border-gray-200 bg-white p-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">{label}</div>
          <DropdownMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
          {isAuthenticated ? (
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault()
                logout()
              }}
              className="flex cursor-pointer select-none items-center rounded px-2 py-2 font-medium text-red-700 outline-none focus:bg-red-50 dark:text-red-300 dark:focus:bg-red-950"
            >
              Logout
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault()
                navigate('/login')
              }}
              className="flex cursor-pointer select-none items-center rounded px-2 py-2 font-medium text-indigo-700 outline-none focus:bg-indigo-50 dark:text-indigo-300 dark:focus:bg-indigo-950"
            >
              Login
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Arrow className="fill-white dark:fill-gray-800" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default UserAvatarMenu
