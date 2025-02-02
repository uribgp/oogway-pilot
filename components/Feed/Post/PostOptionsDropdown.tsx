import React, { useEffect, useState } from 'react'
import Button from '../../Utils/Button'
import DropdownMenu from '../../Utils/DropdownMenu'
import {
    UilQuestionCircle,
    UilExclamationCircle,
    UilBan,
    UilTrashAlt,
    UilEllipsisH,
} from '@iconscout/react-unicons'
import Modal from '../../Utils/Modal'
import { Dialog } from '@headlessui/react'
import { postOptionsDropdownClass } from '../../../styles/feed'
import needsHook from '../../../hooks/needsHook'
import { useRouter } from 'next/router'
import { userProfileState } from '../../../atoms/user'
import { useRecoilValue } from 'recoil'
import { getUserDoc } from '../../../lib/userHelper'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'

type PostOptionsDropdownProps = {
    authorUid: string // Post author id
    deletePost: React.MouseEventHandler<HTMLButtonElement> // Handler function to delete post
    authorName: string // Post author name
}

const PostOptionsDropdown: React.FC<PostOptionsDropdownProps> = ({
    authorUid,
    deletePost,
    authorName,
}) => {
    const userProfile = useRecoilValue(userProfileState) // Get user profile
    const currentUserDoc = getUserDoc(userProfile.uid) // Get user document data

    // Track author blocked state
    const [authorIsBlocked, setAuthorIsBlocked] = useState(false)
    useEffect(() => {
        isUserBlocked(authorUid).then((result) => {
            setAuthorIsBlocked(result)
        })
    }, [authorUid])

    const router = useRouter()

    // Modal state
    const [isOpen, setIsOpen] = useState(false)

    // Helper Functions
    const openModal = () => {
        setIsOpen(true)
    }

    const closeModal = () => {
        setIsOpen(false)
    }

    const isUsersOwnPost = (authorUid: string) => {
        return userProfile.uid === authorUid
    }

    const isUserBlocked = async (authorUid: string) => {
        const isBlocked = await currentUserDoc.then(async (doc) => {
            if (doc?.exists()) {
                return authorUid in doc.data().blockedUsers
            } else {
                return false
            }
        })
        return isBlocked
    }

    // Handler functions
    const blockUser = async (e) => {
        e.preventDefault() // Not sure if necessary

        // Return early if user already blocked
        if (authorIsBlocked) {
            return
        }

        // Otherwise add blocked user uid to current user's
        // blockedUsers map
        await currentUserDoc
            .then(async (doc) => {
                if (doc?.exists()) {
                    let tmp = doc.data()
                    tmp.blockedUsers[authorUid] = true
                    await updateDoc(doc.ref, tmp)
                } else {
                    console.log('User doc not retrieved')
                }
            })
            .catch((err) => {
                console.log(err)
            })

        // Update state
        setAuthorIsBlocked(true)
    }

    const unblockUser = async (e) => {
        e.preventDefault()

        // Return early if user not blocked
        if (!authorIsBlocked) {
            return
        }

        // Remove blocked user uid from current user's
        // blockedUser list
        await currentUserDoc
            .then(async (doc) => {
                if (doc?.exists()) {
                    let tmp = doc.data()
                    delete tmp.blockedUsers[authorUid]
                    await updateDoc(doc.ref, tmp)
                } else {
                    console.log('User doc not retrieved')
                }
            })
            .catch((err) => {
                console.log(err)
            })

        // Update state
        setAuthorIsBlocked(false)
    }

    const deleteAndClose = (e) => {
        e.preventDefault()
        deletePost(e)
        closeModal()

        // Reroute user back to homepage if not already there
        if (router.pathname !== '/') {
            router.push('/')
        }
    }

    // Confirm delete post modal component
    const ConfirmDeletePost = () => {
        return (
            <div className={postOptionsDropdownClass.modalDiv}>
                <Dialog.Title
                    as="div"
                    className={postOptionsDropdownClass.modalTitle}
                >
                    Are you sure you want to delete your post? It will be gone
                    forever.
                </Dialog.Title>

                {/* Cancel / Submit buttons */}
                <div className="inline-flex w-full space-x-3 px-2">
                    <Button
                        text="No"
                        keepText={true}
                        icon={null}
                        type="button"
                        addStyle={postOptionsDropdownClass.modalCancelButton}
                        onClick={closeModal}
                    />
                    <Button
                        text="Yes, delete"
                        keepText={true}
                        icon={<UilTrashAlt />}
                        type="submit"
                        addStyle={postOptionsDropdownClass.modalConfirmButton}
                        onClick={deleteAndClose}
                    />
                </div>
            </div>
        )
    }

    // Dropdown menu props
    const menuButton = <UilEllipsisH />
    const ownPostMenuItems = [
        <Button
            text="Delete Post"
            keepText={true}
            icon={<UilTrashAlt />}
            type="button"
            onClick={openModal}
            addStyle={postOptionsDropdownClass.buttonAddStyle}
        />,
    ]
    const otherPostMenuItems = [
        <Button
            text="Not Interested in This Post"
            keepText={true}
            icon={<UilQuestionCircle />}
            type="button"
            onClick={needsHook}
            addStyle={postOptionsDropdownClass.buttonAddStyle}
        />,
        // TODO: Get more input on business logic. Does not make sense to be able to unblock
        // a user you've previous blocked froom within their posts. Presumably, you wouldn't see
        // a blocked user's posts...
        <Button
            text={`${authorIsBlocked ? 'Unblock' : 'Block'} ${authorName}`}
            keepText={true}
            icon={<UilBan />}
            type="button"
            onClick={authorIsBlocked ? unblockUser : blockUser}
            addStyle={postOptionsDropdownClass.buttonAddStyle}
        />,
        <Button
            text="Report"
            keepText={true}
            icon={<UilExclamationCircle />}
            type="button"
            onClick={needsHook}
            addStyle={postOptionsDropdownClass.buttonAddStyle}
        />,
    ]

    return (
        <>
            <DropdownMenu
                menuButtonClass={postOptionsDropdownClass.menuButtonClass}
                menuItemsClass={postOptionsDropdownClass.menuItemsClass}
                menuButton={menuButton}
                menuItems={
                    isUsersOwnPost(authorUid)
                        ? ownPostMenuItems
                        : otherPostMenuItems
                }
            />
            <Modal
                children={<ConfirmDeletePost />}
                show={isOpen}
                onClose={closeModal}
            />
        </>
    )
}

export default PostOptionsDropdown
