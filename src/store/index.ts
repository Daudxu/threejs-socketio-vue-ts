import app from './modules/app'
import user from './modules/user'


export default function Store() {
    return {
      useAppStore: app(),
      useUserStore: user(),
    }
}
