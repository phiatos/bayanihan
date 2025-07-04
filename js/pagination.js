/**
 * Renders pagination buttons and handles page changes.
 * @param {Array} data - The full dataset to be paginated.
 * @param {number} currentPage - The current active page number.
 * @param {number} rowsPerPage - Number of rows to display per page.
 * @param {HTMLElement} paginationContainer - The DOM element where pagination buttons will be rendered.
 * @param {function(number)} onPageChangeCallback - A callback function to execute when the page changes.
 * This function should accept the new page number and trigger a re-render of the table.
 */
export function renderPagination(data, currentPage, rowsPerPage, paginationContainer, onPageChangeCallback) {
    if (!paginationContainer) {
        console.error("Pagination container not found!");
        return;
    }
    paginationContainer.innerHTML = ""; // Clear existing buttons

    const totalRows = data.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    if (totalPages === 0) { // No pagination needed if there are no rows
        return;
    }

    const createButton = (label, page, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        btn.addEventListener("click", () => {
            if (!disabled) {
                onPageChangeCallback(page);
            }
        });
        return btn;
    };

    // Previous button
    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    const maxVisiblePages = 5; // Number of page buttons to show (e.g., 1 2 3 4 5)
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust startPage if not enough pages after current to fill maxVisiblePages
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Ensure startPage doesn't go below 1
    startPage = Math.max(1, startPage);

    // Render first page and ellipsis if needed
    if (startPage > 1) {
        paginationContainer.appendChild(createButton(1, 1, false, currentPage === 1));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Render visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    // Render ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        paginationContainer.appendChild(createButton(totalPages, totalPages, false, currentPage === totalPages));
    }

    // Next button
    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

/**
 * Updates the text showing the current range of entries.
 * @param {Array} data - The full dataset being paginated.
 * @param {number} currentPage - The current active page number.
 * @param {number} rowsPerPage - Number of rows to display per page.
 * @param {HTMLElement} entriesInfoElement - The DOM element to display the entries info.
 */
export function updateEntriesInfo(data, currentPage, rowsPerPage, entriesInfoElement) {
    if (!entriesInfoElement) {
        console.error("Entries info element not found!");
        return;
    }
    const totalItems = data.length;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    entriesInfoElement.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

/**
 * Gets the paginated slice of data.
 * @param {Array} data - The full dataset.
 * @param {number} currentPage - The current page number.
 * @param {number} rowsPerPage - The number of rows per page.
 * @returns {Array} The slice of data for the current page.
 */
export function getPaginatedData(data, currentPage, rowsPerPage) {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
}