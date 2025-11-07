"use client";
// Color should be this: F08C17
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation"
export default function NotFound() {
    const router = useRouter();
    return (
        <div className="w-full flex items-center justify-center flex-col h-dvh bg-black text-[#F08C17]">
            <div className="flex flex-col items-center gap-4 w-[50%] max-md:w-[90%] text-center">
                <div
                    style={{
                        backgroundImage: "url(/oops.jpg)",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                    }}
                    className="text-9xl bg-clip-text text-transparent font-extrabold">Oops!</div>
                <div className="">
                    <div className="font-semibold my-1">404 - Page Not Found</div>
                    <div>The page you're looking for might have been removed, had it's name changed or temporarily unavailable.</div>
                </div>
                <button onClick={() => {
                    router.back()
                }} className="group flex items-center gap-0 border border-[#F08C17] px-6 py-3 hover:cursor-pointer rounded-md bg-black text-[#F08C17] transition-all duration-300 hover:gap-2 hover:bg-[#F08C17] hover:font-semibold hover:text-black active:gap-2 active:bg-[#F08C17] active:text-black">
                    <ArrowLeftIcon className="w-0 h-5 opacity-0 transition-all duration-300 group-hover:w-5 group-hover:opacity-100 group-active:w-5 group-active:opacity-100" />
                    Go Back

                </button>

                {/* <div className="flex gap-2">
                    <div className="w-3 h-3 bg-[#F08C17] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-[#F08C17] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-[#F08C17] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div> */}
            </div>
        </div>
    )
}