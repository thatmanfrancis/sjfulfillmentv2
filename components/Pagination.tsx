"use client";

interface PaginationProps {
    currentPage: number | any;
    totalPages: number | any;
    itemsPerPage: number | any;
    totalItems: number | any;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    onPageChange,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (
            let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPages - 1, currentPage + delta);
            i++
        ) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, "...");
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push("...", totalPages);
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            {/* Items info */}
            <div className="text-sm text-gray-400">
                Showing {startItem} to {endItem} of {totalItems} results
            </div>

            {/* Pagination controls */}
            <div className="flex items-center space-x-1">
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === 1
                            ? "text-gray-500 cursor-not-allowed"
                            : "text-gray-300 hover:text-white hover:bg-gray-800"
                        }`}
                >
                    Previous
                </button>

                {/* Page numbers */}
                {getVisiblePages().map((page, index) => (
                    <div key={index}>
                        {page === "..." ? (
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                        ) : (
                            <button
                                onClick={() => onPageChange(page as number)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === page
                                        ? "bg-[#f08c17] text-black"
                                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                                    }`}
                            >
                                {page}
                            </button>
                        )}
                    </div>
                ))}

                {/* Next button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === totalPages
                            ? "text-gray-500 cursor-not-allowed"
                            : "text-gray-300 hover:text-white hover:bg-gray-800"
                        }`}
                >
                    Next
                </button>
            </div>
        </div>
    );
}